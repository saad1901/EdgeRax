import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { chapters, lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { deleteWasabiVideo, getVideoKeyFromMarker, isPrivateVideoMarker } from "@/lib/wasabi-video"
import { requireManageChapter } from "@/lib/course-access"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await requireManageChapter(id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { title } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "title required." }, { status: 400 })
  await db.update(chapters).set({ title: title.trim() }).where(eq(chapters.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await requireManageChapter(id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const lsns = await db.select().from(lessons).where(eq(lessons.chapterId, id))
  for (const l of lsns) {
    if (isPrivateVideoMarker(l.videoUrl)) {
      try {
        await deleteWasabiVideo(getVideoKeyFromMarker(l.videoUrl, l.id))
      } catch (error) {
        console.warn("[DELETE /api/admin/chapters/[id]] Wasabi video cleanup failed", error)
      }
    }
  }
  await db.delete(chapters).where(eq(chapters.id, id))
  return NextResponse.json({ ok: true })
}
