import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { progress, purchases, lessons, chapters } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  const rows = await db.select().from(progress).where(eq(progress.userId, user.id))
  return NextResponse.json(rows.map((r: { lessonId: string }) => r.lessonId))
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  try {
    const { lessonId } = await req.json()
    if (!lessonId) return NextResponse.json({ error: "lessonId required." }, { status: 400 })

    // Verify the user owns the course that contains this lesson
    const lessonRows = await db.select().from(lessons).where(eq(lessons.id, lessonId))
    const lesson = lessonRows[0]
    if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 })

    const chapterRows = await db.select().from(chapters).where(eq(chapters.id, lesson.chapterId))
    const chapter = chapterRows[0]
    if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 })

    const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, user.id))
    const owned = userPurchases.some((p: { courseId: string }) => p.courseId === chapter.courseId)
    if (!owned) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

    const existing = await db.select().from(progress)
      .where(and(eq(progress.userId, user.id), eq(progress.lessonId, lessonId)))
    if (existing.length === 0)
      await db.insert(progress).values({ id: uid("prog"), userId: user.id, lessonId })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/progress]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
