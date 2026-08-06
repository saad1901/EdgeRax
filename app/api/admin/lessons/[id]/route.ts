import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import fs from "fs"
import path from "path"
import { deleteWasabiVideo, getVideoKeyFromMarker, isPrivateVideoMarker } from "@/lib/wasabi-video"
import { requireManageLesson } from "@/lib/course-access"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireManageLesson(id)
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const body = await req.json()
  const rows = await db.select().from(lessons).where(eq(lessons.id, id))
  const previous = rows[0]
  if (!previous) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const allowed = ["title", "duration", "preview", "videoUrl", "lessonType", "pdfPath", "pdfTitle", "pdfDescription", "urlLink"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  if (update.lessonType === undefined) {
    update.lessonType = "VIDEO"
  }
  await db.update(lessons).set(update).where(eq(lessons.id, id))

  if ("videoUrl" in update && !isPrivateVideoMarker(String(update.videoUrl)) && isPrivateVideoMarker(previous.videoUrl)) {
    try {
      await deleteWasabiVideo(getVideoKeyFromMarker(previous.videoUrl, id))
    } catch (error) {
      console.warn("[PATCH /api/admin/lessons/[id]] Wasabi video cleanup failed", error)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await requireManageLesson(id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const rows = await db.select().from(lessons).where(eq(lessons.id, id))
  if (isPrivateVideoMarker(rows[0]?.videoUrl)) {
    try {
      await deleteWasabiVideo(getVideoKeyFromMarker(rows[0]?.videoUrl, id))
    } catch (error) {
      console.warn("[DELETE /api/admin/lessons/[id]] Wasabi video cleanup failed", error)
    }
  }
  if (rows[0]?.pdfPath) {
    const fp = path.join(process.cwd(), "storage", "pdfs", path.basename(rows[0].pdfPath))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }
  await db.delete(lessons).where(eq(lessons.id, id))
  return NextResponse.json({ ok: true })
}
