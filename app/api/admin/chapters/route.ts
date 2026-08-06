import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chapters } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uid } from "@/lib/auth"
import { requireManageCourse } from "@/lib/course-access"

export async function POST(req: NextRequest) {
  try {
    const { courseId, title } = await req.json()
    if (!courseId || !title?.trim())
      return NextResponse.json({ error: "courseId and title required." }, { status: 400 })
    if (!await requireManageCourse(courseId)) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

    const existing = await db.select().from(chapters).where(eq(chapters.courseId, courseId))
    const chapter = { id: uid("ch"), courseId, title: title.trim(), position: existing.length }
    await db.insert(chapters).values(chapter)
    return NextResponse.json({ ...chapter, lessons: [] }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/chapters]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
