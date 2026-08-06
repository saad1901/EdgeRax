import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { uid } from "@/lib/auth"
import { requireManageChapter } from "@/lib/course-access"

export async function POST(req: NextRequest) {
  try {
    const { chapterId, title, duration, preview, videoUrl, lessonType, pdfPath, pdfTitle, pdfDescription, urlLink } = await req.json()
    if (!chapterId || !title?.trim())
      return NextResponse.json({ error: "chapterId and title required." }, { status: 400 })
    if (!await requireManageChapter(chapterId)) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

    const existing = await db.select().from(lessons).where(eq(lessons.chapterId, chapterId))
    const lesson = {
      id: uid("l"), chapterId, title: title.trim(),
      lessonType: (lessonType === "PDF" ? "PDF" : lessonType === "URL" ? "URL" : "VIDEO") as "VIDEO" | "PDF" | "URL",
      duration: duration?.trim() ?? "", preview: Boolean(preview),
      videoUrl: videoUrl?.trim() ?? "",
      pdfPath: pdfPath?.trim() ?? "",
      pdfTitle: pdfTitle?.trim() ?? "",
      pdfDescription: pdfDescription?.trim() ?? "",
      urlLink: urlLink?.trim() ?? "",
      position: existing.length,
    }
    await db.insert(lessons).values(lesson)
    return NextResponse.json(lesson, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/lessons]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
