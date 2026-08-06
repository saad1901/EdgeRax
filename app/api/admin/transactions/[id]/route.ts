import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, courses, referralEarnings, purchaseAllocations } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * DELETE /api/admin/transactions/[id]
 *
 * Deletes a purchase and all related data:
 *   1. purchase_allocations cascade automatically (FK)
 *   2. referral_earnings where referredId = purchase.userId AND courseId = purchase.courseId
 *   3. Decrements course.students counter
 *   4. Deletes the purchase itself (revokes course access)
 *
 * Note: progress rows for lessons in this course are NOT removed —
 * the student's progress data is harmless to keep.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id: purchaseId } = await params

  // Load the purchase
  const rows = await db.select().from(purchases).where(eq(purchases.id, purchaseId))
  const purchase = rows[0]
  if (!purchase)
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 })

  try {
    // 1. Delete referral earnings tied to this purchase (buyer + course match)
    await db.delete(referralEarnings).where(
      and(
        eq(referralEarnings.referredId, purchase.userId),
        eq(referralEarnings.courseId,   purchase.courseId),
      )
    )

    // 2. Delete purchase_allocations (also cascades from FK, but be explicit)
    await db.delete(purchaseAllocations).where(eq(purchaseAllocations.purchaseId, purchaseId))

    // 3. Decrement course.students (floor at 0)
    const courseRows = await db.select().from(courses).where(eq(courses.id, purchase.courseId))
    const course = courseRows[0]
    if (course) {
      await db.update(courses)
        .set({ students: Math.max(0, course.students - 1) })
        .where(eq(courses.id, purchase.courseId))
    }

    // 4. Delete the purchase itself — this revokes course access for the student
    await db.delete(purchases).where(eq(purchases.id, purchaseId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/admin/transactions/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
