import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { lessons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireManageLesson } from "@/lib/course-access"

const PDF_DIR = path.join(process.cwd(), "storage", "pdfs")
const MAX_SIZE = 20 * 1024 * 1024
const ALLOWED_TYPES = ["application/pdf"]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const lessonId = formData.get("lessonId") as string | null
    const file = formData.get("file") as File | null

    if (!lessonId || !file) {
      return NextResponse.json({ error: "lessonId and file are required." }, { status: 400 })
    }

    if (!await requireManageLesson(lessonId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 415 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 20 MB limit." }, { status: 413 })
    }

    const lesson = (await db.select().from(lessons).where(eq(lessons.id, lessonId)))[0]
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 })
    }

    fs.mkdirSync(PDF_DIR, { recursive: true })
    const safeName = `${lessonId}-${Date.now()}.pdf`
    const dest = path.join(PDF_DIR, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(dest, buffer)

    await db.update(lessons)
      .set({ pdfPath: `/api/upload/pdf/${safeName}`, lessonType: "PDF" })
      .where(eq(lessons.id, lessonId))

    return NextResponse.json({ ok: true, pdfPath: `/api/upload/pdf/${safeName}` })
  } catch (err) {
    console.error("[POST /api/upload/pdf]", err)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<Record<string, string | string[]>> }) {
  const { path: segments } = await params
  const filename = Array.isArray(segments) ? segments[0] : segments
  if (!filename) return new NextResponse("Not found.", { status: 404 })

  const filePath = path.join(PDF_DIR, filename)
  if (!fs.existsSync(filePath)) return new NextResponse("Not found.", { status: 404 })

  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized.", { status: 401 })

  const lessonRows = await db.select().from(lessons).where(eq(lessons.pdfPath, `/api/upload/pdf/${filename}`))
  const lesson = lessonRows[0]
  if (!lesson) return new NextResponse("Forbidden.", { status: 403 })

  const chapterRows = await db.select().from((await import("@/lib/db/schema")).chapters).where(eq((await import("@/lib/db/schema")).chapters.id, lesson.chapterId))
  const chapter = chapterRows[0]
  if (!chapter) return new NextResponse("Not found.", { status: 404 })

  const purchases = await db.select().from((await import("@/lib/db/schema")).purchases).where(eq((await import("@/lib/db/schema")).purchases.userId, user.id))
  const purchase = purchases.find((p: { courseId: string; expiresAt?: string | null }) => p.courseId === chapter.courseId)
  const purchased = purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date())
  if (!purchased && !lesson.preview) return new NextResponse("Forbidden.", { status: 403 })

  const stream = fs.createReadStream(filePath)
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control":       "private, no-store",
      // Do NOT set X-Frame-Options — it blocks the iframe viewer on same origin.
      // Do NOT set Content-Disposition: attachment — that forces download instead of inline view.
    },
  })
}

export const config = {
  api: { bodyParser: false },
}
