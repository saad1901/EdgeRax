import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons, purchases, chapters } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { getCdnVideoUrl, getVideoKeyFromMarker, getWasabiVideo, headWasabiVideo } from "@/lib/wasabi-video"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params

  // 1. Fetch lesson
  const lessonRows = await db.select().from(lessons).where(eq(lessons.id, lessonId))
  const lesson = lessonRows[0]
  if (!lesson) return new NextResponse("Not found.", { status: 404 })

  // 2. Access check — free preview OR authenticated + purchased
  if (!lesson.preview) {
    const user = await getCurrentUser()
    if (!user) return new NextResponse("Unauthorized.", { status: 401 })

    const chapterRows = await db.select().from(chapters).where(eq(chapters.id, lesson.chapterId))
    const chapter = chapterRows[0]
    if (!chapter) return new NextResponse("Not found.", { status: 404 })

    const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, user.id))
    const purchase = userPurchases.find((p: { courseId: string; expiresAt?: string | null }) => p.courseId === chapter.courseId)
    const purchased = purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date())
    if (!purchased) return new NextResponse("Forbidden.", { status: 403 })
  }

  // 3. Resolve object key
  const key = getVideoKeyFromMarker(lesson.videoUrl, lessonId)
  if (!key) return new NextResponse("Video file not found.", { status: 404 })

  // 4. If Bunny CDN is configured, redirect to the CDN URL.
  //    Bunny pulls from Wasabi as origin — no server bandwidth used.
  const cdnUrl = getCdnVideoUrl(key)
  if (cdnUrl) {
    return NextResponse.redirect(cdnUrl, { status: 302 })
  }

  // 5. Fallback: proxy directly from Wasabi (no CDN configured)
  let metadata
  try {
    metadata = await headWasabiVideo(key)
  } catch {
    return new NextResponse("Video file not found.", { status: 404 })
  }

  const fileSize = Number(metadata.ContentLength ?? 0)
  if (!fileSize) return new NextResponse("Video file not found.", { status: 404 })
  const rangeHeader = req.headers.get("range")
  const contentType = metadata.ContentType || "video/mp4"

  const securityHeaders = {
    "Content-Type": contentType,
    "Content-Disposition": "inline",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Frame-Options": "SAMEORIGIN",
  }

  // Range request (seeking)
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-")
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)

    if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      })
    }

    const chunkSize = end - start + 1
    const video = await getWasabiVideo(key, `bytes=${start}-${end}`)
    const stream = video.Body?.transformToWebStream()
    if (!stream) return new NextResponse("Video file not found.", { status: 404 })

    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...securityHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    })
  }

  // Full response
  const video = await getWasabiVideo(key)
  const stream = video.Body?.transformToWebStream()
  if (!stream) return new NextResponse("Video file not found.", { status: 404 })

  return new NextResponse(stream, {
    status: 200,
    headers: { ...securityHeaders, "Accept-Ranges": "bytes", "Content-Length": String(fileSize) },
  })
}
