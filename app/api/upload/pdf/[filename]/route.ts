import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { lessons, chapters, purchases } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const PDF_DIR = path.join(process.cwd(), "storage", "pdfs")

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  const filePath = path.join(PDF_DIR, filename)
  if (!filename || !fs.existsSync(filePath)) return new NextResponse("Not found.", { status: 404 })

  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized.", { status: 401 })

  const lessonRows = await db.select().from(lessons).where(eq(lessons.pdfPath, `/api/upload/pdf/${filename}`))
  const lesson = lessonRows[0]
  if (!lesson) return new NextResponse("Forbidden.", { status: 403 })

  const chapterRows = await db.select().from(chapters).where(eq(chapters.id, lesson.chapterId))
  const chapter = chapterRows[0]
  if (!chapter) return new NextResponse("Not found.", { status: 404 })

  const purchasesRows = await db.select().from(purchases).where(eq(purchases.userId, user.id))
  const purchase = purchasesRows.find((p: { courseId: string; expiresAt?: string | null }) => p.courseId === chapter.courseId)
  const purchased = purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date())
  if (!purchased && !lesson.preview) return new NextResponse("Forbidden.", { status: 403 })

  const stream = fs.createReadStream(filePath)
  return new NextResponse(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  })
}
