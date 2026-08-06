import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, users, courses, referralEarnings, purchaseAllocations } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Purchase   = InferSelectModel<typeof purchases>
type User       = InferSelectModel<typeof users>
type Course     = InferSelectModel<typeof courses>
type Earning    = InferSelectModel<typeof referralEarnings>
type Allocation = InferSelectModel<typeof purchaseAllocations>

/**
 * GET /api/admin/transactions
 * Returns every purchase enriched with:
 *   - student name + email
 *   - course title
 *   - allocations (instructor cut, share cuts)
 *   - referral earning (who referred, amount, status)
 */
export async function GET() {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allPurchases, allUsers, allCourses, allEarnings, allAllocations] = await Promise.all([
    db.select().from(purchases),
    db.select().from(users),
    db.select().from(courses),
    db.select().from(referralEarnings),
    db.select().from(purchaseAllocations),
  ]) as [Purchase[], User[], Course[], Earning[], Allocation[]]

  const userMap   = new Map(allUsers.map((u) => [u.id, u]))
  const courseMap = new Map(allCourses.map((c) => [c.id, c]))

  // Build a set of instructor IDs so we never show them as "referred by"
  const instructorIds = new Set(
    allUsers.filter((u) => u.role === "instructor").map((u) => u.id)
  )

  const rows = [...allPurchases]
    .sort((a, b) => new Date(String(b.purchasedAt)).getTime() - new Date(String(a.purchasedAt)).getTime())
    .map((p) => {
      const student = userMap.get(p.userId)
      const course  = courseMap.get(p.courseId)

      // allocations for this purchase
      const allocs = allAllocations.filter((a) => a.purchaseId === p.id)

      // Only count genuine student referrals — exclude any instructor rows that
      // legacy giveaway code may have written into referral_earnings
      const referralEarning = allEarnings.find(
        (e) =>
          e.referredId === p.userId &&
          e.courseId === p.courseId &&
          !instructorIds.has(e.referrerId)
      )
      const referrer = referralEarning ? userMap.get(referralEarning.referrerId) : null

      // Coupon discount: if the student paid less than the current course price,
      // a coupon was applied. discount = coursePrice - paidAmount (floor at 0).
      // Note: course may be deleted or price may have changed — we show discount
      // only when it's clearly positive.
      const coursePrice   = course ? Number(course.price) : null
      const paidAmount    = Number(p.amount)
      const couponDiscount =
        coursePrice != null && coursePrice > paidAmount && paidAmount >= 0
          ? Math.round((coursePrice - paidAmount) * 100) / 100
          : null

      return {
        id:          p.id,
        purchasedAt: p.purchasedAt,
        amount:      paidAmount,
        paymentId:   p.paymentId,
        expiresAt:   p.expiresAt ?? null,
        couponDiscount,   // null = no coupon, number = discount amount

        student: student
          ? { id: student.id, name: student.name, email: student.email }
          : { id: p.userId, name: "Deleted user", email: "" },

        course: course
          ? { id: course.id, title: course.title, originalPrice: Number(course.price) }
          : { id: p.courseId, title: "Deleted course", originalPrice: null },

        allocations: allocs.map((a) => ({
          type:          a.type,
          referenceName: a.referenceName,
          percentage:    Number(a.percentage),
          amount:        Number(a.amount),
        })),

        referral: referralEarning
          ? {
              referrerId:   referralEarning.referrerId,
              referrerName: referrer?.name ?? "Unknown",
              amount:       Number(referralEarning.amount),
              status:       referralEarning.status,
            }
          : null,
      }
    })

  return NextResponse.json(rows)
}
