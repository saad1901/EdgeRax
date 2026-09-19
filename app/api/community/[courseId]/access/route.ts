import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, purchases } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * GET /api/community/[courseId]/access
 * Returns { hasAccess: boolean, role: "student"|"instructor"|"admin" }
 *
 * Access rules:
 *  - admin          → always
 *  - instructor     → if courses.instructorId === user.id
 *  - student/user   → if they have an active (non-expired) purchase for the course
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ hasAccess: false }, { status: 401 })

  if (user.role === "admin") {
    return NextResponse.json({ hasAccess: true, role: "admin" })
  }

  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
  const course = courseRows[0]
  if (!course) return NextResponse.json({ hasAccess: false }, { status: 404 })

  if (user.role === "instructor" && course.instructorId === user.id) {
    return NextResponse.json({ hasAccess: true, role: "instructor" })
  }

  // Student: must have an active purchase
  const purchaseRows = await db.select().from(purchases)
    .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
  const purchase = purchaseRows[0]
  const active = purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date())
  if (!active) return NextResponse.json({ hasAccess: false })

  return NextResponse.json({ hasAccess: true, role: "student" })
}
