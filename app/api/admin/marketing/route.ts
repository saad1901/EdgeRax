import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * GET /api/admin/marketing
 * Returns all courses with their marketing fields (students, marketingStudentCount, studentCountMode).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const rows = await db
    .select({
      id:                    courses.id,
      title:                 courses.title,
      thumbnail:             courses.thumbnail,
      students:              courses.students,
      rating:                courses.rating,
      marketingStudentCount: courses.marketingStudentCount,
      studentCountMode:      courses.studentCountMode,
      urgencyLabel:          courses.urgencyLabel,
    })
    .from(courses)

  return NextResponse.json(rows)
}

/**
 * PATCH /api/admin/marketing
 * Body: { courseId: string; marketingStudentCount: number; studentCountMode: "actual"|"custom"|"total" }
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { courseId, marketingStudentCount, studentCountMode, urgencyLabel, rating } = await req.json()

    if (!courseId)
      return NextResponse.json({ error: "courseId is required." }, { status: 400 })

    const validModes = ["actual", "custom", "total"]
    if (studentCountMode && !validModes.includes(studentCountMode))
      return NextResponse.json({ error: "Invalid studentCountMode." }, { status: 400 })

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    if (!courseRows[0])
      return NextResponse.json({ error: "Course not found." }, { status: 404 })

    const updates: Record<string, any> = {}
    if (marketingStudentCount !== undefined)
      updates.marketingStudentCount = Math.max(0, Number(marketingStudentCount) || 0)
    if (studentCountMode !== undefined)
      updates.studentCountMode = studentCountMode
    if (urgencyLabel !== undefined)
      updates.urgencyLabel = String(urgencyLabel ?? "").slice(0, 512)
    if (rating !== undefined) {
      const r = Math.round(Number(rating) * 10) / 10  // one decimal place
      updates.rating = Math.min(5, Math.max(0, isNaN(r) ? 0 : r))
    }

    if (Object.keys(updates).length > 0) {
      await db.update(courses).set(updates).where(eq(courses.id, courseId))
    }

    const updated = await db
      .select({
        id:                    courses.id,
        students:              courses.students,
        rating:                courses.rating,
        marketingStudentCount: courses.marketingStudentCount,
        studentCountMode:      courses.studentCountMode,
        urgencyLabel:          courses.urgencyLabel,
      })
      .from(courses)
      .where(eq(courses.id, courseId))

    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[PATCH /api/admin/marketing]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
