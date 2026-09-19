import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import fs from "fs"
import path from "path"
import { deleteWasabiVideo, getVideoKeyFromMarker, getVideoMarker, getLocalVideoMarker, uploadVideoToWasabi } from "@/lib/wasabi-video"
import { requireManageLesson } from "@/lib/course-access"

const MAX_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]

export const runtime = "nodejs"

/** POST /api/upload/video
 *  Body: FormData { lessonId: string, file: File }
 *  Admin only. Saves to Wasabi S3 and updates video_url to "wasabi:<object-key>".
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const lessonId = formData.get("lessonId") as string | null
    const file = formData.get("file") as File | null
    const storageType = (formData.get("storageType") as string | null) || "cloud"

    if (!lessonId || !file) {
      return NextResponse.json({ error: "lessonId and file are required." }, { status: 400 })
    }

    if (!await requireManageLesson(lessonId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    // Validate type (client-supplied MIME can be spoofed — also check magic bytes)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 415 }
      )
    }

    // Magic byte check: read first 12 bytes and verify against known video signatures
    const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const isMP4  = headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x70  // ftyp box
    const isWebM = headerBytes[0] === 0x1A && headerBytes[1] === 0x45 && headerBytes[2] === 0xDF && headerBytes[3] === 0xA3  // EBML header
    const isMOV  = headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x71  // ftyp qt
    if (!isMP4 && !isWebM && !isMOV) {
      return NextResponse.json({ error: "File content does not match a supported video format." }, { status: 415 })
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 2 GB limit." }, { status: 413 })
    }

    // Verify lesson exists
    const lessonRows = await db.select().from(lessons).where(eq(lessons.id, lessonId))
    const lesson = lessonRows[0]
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 })
    }

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : ".mp4"

    if (storageType === "local") {
      const dir = path.join(process.cwd(), "storage", "videos")
      fs.mkdirSync(dir, { recursive: true })
      const filename = `${lessonId}-${Date.now()}${extension}`
      const out = path.join(dir, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(out, buffer)

      const videoUrl = getLocalVideoMarker(filename)
      await db.update(lessons).set({ videoUrl }).where(eq(lessons.id, lessonId))

      const oldKey = getVideoKeyFromMarker(lesson.videoUrl)
      if (oldKey && oldKey !== videoUrl) {
        try {
          await deleteWasabiVideo(oldKey)
        } catch (error) {
          console.warn("[POST /api/upload/video] old video cleanup failed", error)
        }
      }

      return NextResponse.json({ ok: true, videoUrl })
    }

    // Upload file to Wasabi S3. The app streams it later through /api/video/[lessonId].
    const body = Buffer.from(await file.arrayBuffer())
    const key = await uploadVideoToWasabi({
      lessonId,
      body,
      contentType: file.type,
      contentLength: file.size,
    })
    const videoUrl = getVideoMarker(key)

    await db.update(lessons)
      .set({ videoUrl })
      .where(eq(lessons.id, lessonId))

    const oldKey = getVideoKeyFromMarker(lesson.videoUrl)
    if (oldKey && oldKey !== key) {
      try {
        await deleteWasabiVideo(oldKey)
      } catch (error) {
        console.warn("[POST /api/upload/video] old video cleanup failed", error)
      }
    }

    return NextResponse.json({ ok: true, videoUrl })
  } catch (err) {
    console.error("[POST /api/upload/video]", err)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

export const config = {
  api: { bodyParser: false },
}
