import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons, users } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { uid } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"
import { getCourseManager } from "@/lib/course-access"

type Course  = InferSelectModel<typeof courses>
type Chapter = InferSelectModel<typeof chapters>
type Lesson  = InferSelectModel<typeof lessons>

export async function GET() {
  const manager = await getCourseManager()
  if (!manager) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allCourses, allChapters, allLessons] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.createdAt)),
    db.select().from(chapters).orderBy(asc(chapters.position)),
    db.select().from(lessons).orderBy(asc(lessons.position)),
  ])

  const visibleCourses = manager.role === "admin"
    ? allCourses
    : allCourses.filter((c: Course) => c.instructorId === manager.id)

  return NextResponse.json(visibleCourses.map((c: Course) => ({
    ...c,
    chapters: allChapters
      .filter((ch: Chapter) => ch.courseId === c.id)
      .map((ch: Chapter) => ({ ...ch, lessons: allLessons.filter((l: Lesson) => l.chapterId === ch.id) })),
  })))
}

export async function POST(req: NextRequest) {
  const manager = await getCourseManager()
  if (!manager) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  try {
    const body = await req.json()
    const { title, instructor, instructorId, category, description, shortDescription, duration, price, originalPrice, thumbnail, level, status, startDate } = body
    if (!title?.trim())
      return NextResponse.json({ error: "Title is required." }, { status: 400 })

    let selectedInstructorId = manager.role === "instructor" ? manager.id : (instructorId || null)
    let selectedInstructorName = manager.role === "instructor" ? manager.name : instructor?.trim()

    if (manager.role === "admin" && selectedInstructorId) {
      const instructorRows = await db.select().from(users).where(eq(users.id, selectedInstructorId))
      const selected = instructorRows[0]
      if (!selected || selected.role !== "instructor") {
        return NextResponse.json({ error: "Selected instructor was not found." }, { status: 400 })
      }
      selectedInstructorName = selected.name
    }

    if (!selectedInstructorName) {
      return NextResponse.json({ error: "Instructor is required." }, { status: 400 })
    }

    const course = {
      id: uid("course"), title: title.trim(), instructor: selectedInstructorName, instructorId: selectedInstructorId,
      category: category ?? "Development", description: description?.trim() ?? "",
      shortDescription: shortDescription?.trim() ?? "", duration: duration?.trim() || "Self-paced",
      price: Number(price) || 0,
      originalPrice: originalPrice != null && originalPrice !== "" ? Number(originalPrice) : null,
      thumbnail: thumbnail ?? "", level: level ?? "Beginner",
      status: (status ?? "recorded") as "upcoming" | "ongoing" | "recorded",
      startDate: startDate || null,
      rating: 0, students: 0,
    }
    await db.insert(courses).values(course)
    return NextResponse.json({ ...course, chapters: [] }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/courses]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
