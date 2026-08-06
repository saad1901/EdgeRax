import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, purchases } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"
import { requireManageCourse } from "@/lib/course-access"

type Purchase = InferSelectModel<typeof purchases>
type User     = InferSelectModel<typeof users>

/**
 * GET /api/admin/courses/[id]/students
 * Returns all students enrolled in a specific course.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params
  if (!await requireManageCourse(courseId))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const coursePurchases = await db.select().from(purchases).where(eq(purchases.courseId, courseId)) as Purchase[]
  const allUsers = await db.select().from(users) as User[]

  const students = coursePurchases.map((p: Purchase) => {
    const u = allUsers.find((u: User) => u.id === p.userId)
    return {
      purchaseId:  p.id,
      userId:      p.userId,
      name:        u?.name  ?? "Unknown",
      email:       u?.email ?? "Unknown",
      amount:      p.amount,
      paymentId:   p.paymentId,
      purchasedAt: p.purchasedAt,
    }
  })

  return NextResponse.json(students)
}
