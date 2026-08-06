import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import { computeExpiresAt } from "@/lib/format"
import { recordAllocations } from "@/lib/allocations"

/**
 * POST /api/admin/giveaway
 * Body: { userId, courseId, amount?, paymentMode?: "free" | "cash" }
 *
 * - "free"  → amount = 0, paymentId = "giveaway"
 * - "cash"  → amount = body.amount (offline payment), paymentId = "cash-offline"
 *             Instructor commission is automatically recorded as a credited
 *             referral-style earning so their revenue totals stay accurate.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { userId, courseId, paymentMode = "cash", amount: rawAmount } = await req.json()
    if (!userId || !courseId)
      return NextResponse.json({ error: "userId and courseId are required." }, { status: 400 })

    const isFree = paymentMode === "free"
    const amount = isFree ? 0 : Math.max(0, Number(rawAmount) || 0)

    if (!isFree && amount <= 0)
      return NextResponse.json({ error: "Enter a valid amount for cash payment." }, { status: 400 })

    // Verify user
    const userRows = await db.select().from(users).where(eq(users.id, userId))
    const targetUser = userRows[0]
    if (!targetUser)
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    if (targetUser.role === "admin")
      return NextResponse.json({ error: "Cannot grant access to admin accounts." }, { status: 400 })

    // Verify course
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // Already enrolled?
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Student is already enrolled in this course." }, { status: 409 })

    const purchasedAt = new Date().toISOString()
    const expiresAt   = computeExpiresAt(purchasedAt, course.validityDays)

    // Insert purchase
    const purchase = {
      id:          uid("pur"),
      userId,
      courseId,
      amount,
      paymentId:   isFree ? "giveaway" : "cash-offline",
      purchasedAt,
      expiresAt,
    }
    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    // For cash payments: snapshot allocations (instructor commission + revenue shares)
    // NOTE: instructor payout is recorded in purchase_allocations (type="instructor"),
    // NOT in referral_earnings. referral_earnings is only for student referral codes.
    if (!isFree && amount > 0) {
      await recordAllocations({
        purchaseId:   purchase.id,
        courseId,
        paidAmount:   amount,
        instructorId: course.instructorId ?? null,
        referrerId:   null,
      })
    }

    return NextResponse.json({ ok: true, purchase }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/giveaway]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
