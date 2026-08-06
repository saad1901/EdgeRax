import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { courses, purchases, purchaseAllocations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

type Purchase   = InferSelectModel<typeof purchases>
type Course     = InferSelectModel<typeof courses>
type Allocation = InferSelectModel<typeof purchaseAllocations>

function roundMoney(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100 }

/**
 * GET /api/instructor/earnings
 *
 * Instructor sees only their share — no gross revenue exposed.
 * Earnings are read from purchase_allocations (type="instructor", referenceId=user.id)
 * so historical commission rates are respected even after the % is changed.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "instructor")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  // All courses belonging to this instructor
  const instructorCourses: Course[] = await db
    .select()
    .from(courses)
    .where(eq(courses.instructorId, user.id))

  if (instructorCourses.length === 0) {
    return NextResponse.json({
      commissionPercent: Number(user.commissionPercent ?? 0),
      totalSales: 0,
      totalEarnings: 0,
      perCourse: [],
    })
  }

  const courseIds = new Set(instructorCourses.map((c) => c.id))

  // Load all purchases for these courses (for sales count)
  const allPurchases: Purchase[] = await db.select().from(purchases)
  const relevantPurchases = allPurchases.filter((p) => courseIds.has(p.courseId))

  // Load allocation rows for this instructor — these are the immutable locked amounts
  const allAllocations: Allocation[] = await db.select().from(purchaseAllocations)
  const instructorAllocations = allAllocations.filter(
    (a) => a.type === "instructor" && a.referenceId === user.id
  )

  // Build a map: courseId → total locked earnings
  const earningsByCourse = new Map<string, number>()
  for (const alloc of instructorAllocations) {
    // Find which course this purchase belongs to
    const purchase = relevantPurchases.find((p) => p.id === alloc.purchaseId)
    if (!purchase) continue
    const prev = earningsByCourse.get(purchase.courseId) ?? 0
    earningsByCourse.set(purchase.courseId, prev + Number(alloc.amount))
  }

  const perCourse = instructorCourses.map((course) => {
    const coursePurchases = relevantPurchases.filter((p) => p.courseId === course.id)
    const earnings = roundMoney(earningsByCourse.get(course.id) ?? 0)
    return {
      courseId:    course.id,
      courseTitle: course.title,
      sales:       coursePurchases.length,
      earnings,
    }
  })

  const totalSales    = relevantPurchases.length
  const totalEarnings = roundMoney(
    instructorAllocations
      .filter((a) => {
        const p = relevantPurchases.find((p) => p.id === a.purchaseId)
        return Boolean(p)
      })
      .reduce((s, a) => s + Number(a.amount), 0)
  )

  return NextResponse.json({
    commissionPercent: Number(user.commissionPercent ?? 0),
    totalSales,
    totalEarnings,
    perCourse,
  })
}
