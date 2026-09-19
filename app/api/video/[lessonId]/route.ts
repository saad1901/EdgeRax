import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { lessons, purchases, chapters } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import fs from "fs"
import { Readable } from "stream"
import { getCurrentUser } from "@/lib/auth"
import {
  generateGcoreCdnUrl,
  getVideoKeyFromMarker,
  getWasabiVideo,
  headWasabiVideo,
  isLocalVideoMarker,
} from "@/lib/wasabi-video"

export const runtime = "nodejs"

const MAX_STREAM_CHUNK_SIZE = 5 * 1024 * 1024  // 5 MB per range request

function parseRange(rangeHeader: string | null, fileSize: number) {
  const match = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null

  let start: number
  let end: number

  if (match[1] === "" && match[2] !== "") {
    const suffixLength = Number(match[2])
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : Math.min(start + MAX_STREAM_CHUNK_SIZE - 1, fileSize - 1)
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end >= fileSize ||
    start > end
  ) {
    return null
  }

  end = Math.min(end, start + MAX_STREAM_CHUNK_SIZE - 1)
  return { start, end, chunkSize: end - start + 1 }
}

function initialRange(fileSize: number) {
  const start = 0
  const end = Math.min(MAX_STREAM_CHUNK_SIZE - 1, fileSize - 1)
  return { start, end, chunkSize: end - start + 1 }
}

function rangeNotSatisfiable(fileSize: number) {
  return new NextResponse("Range Not Satisfiable", {
    status: 416,
    headers: { "Content-Range": `bytes */${fileSize}` },
  })
}

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
    // Fetch user + chapter in parallel
    const [user, chapterRows] = await Promise.all([
      getCurrentUser(),
      db.select().from(chapters).where(eq(chapters.id, lesson.chapterId)),
    ])
    if (!user) return new NextResponse("Unauthorized.", { status: 401 })

    const chapter = chapterRows[0]
    if (!chapter) return new NextResponse("Not found.", { status: 404 })

    // Query only this course's purchase for this user — not all purchases
    const purchaseRows = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, chapter.courseId)))
    const purchase = purchaseRows[0]
    const purchased = purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date())
    if (!purchased) return new NextResponse("Forbidden.", { status: 403 })
  }

  // 3. Block direct browser navigation / file download via address bar
  const fetchDest = req.headers.get("sec-fetch-dest")
  if (fetchDest === "document") {
    return new NextResponse("Direct video download is disabled.", { status: 403 })
  }

  const rawUrl = lesson.videoUrl?.trim() ?? ""

  // 4. External URL (Google Drive, Dropbox, direct MP4) — proxy stream server-side
  if (/^https?:\/\//i.test(rawUrl)) {
    let targetUrl = rawUrl
    if (/drive\.google\.com/.test(targetUrl)) {
      const driveId = (
        targetUrl.match(/\/file\/d\/([^/?#]+)/) ||
        targetUrl.match(/[?&]id=([^&]+)/)
      )?.[1]
      if (driveId) {
        targetUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${driveId}`
      }
    } else if (/dropbox\.com/.test(targetUrl)) {
      targetUrl = targetUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/[?&]dl=\d/, "")
    }

    const rangeHeader = req.headers.get("range")
    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: rangeHeader ? { Range: rangeHeader } : undefined,
      })

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return new NextResponse("Failed to stream video source.", { status: 502 })
      }

      const headers = new Headers()
      headers.set("Content-Type", upstreamRes.headers.get("content-type") || "video/mp4")
      headers.set("Content-Disposition", "inline")
      headers.set("Cache-Control", "private, max-age=3600")
      headers.set("X-Content-Type-Options", "nosniff")
      headers.set("X-Frame-Options", "SAMEORIGIN")

      if (upstreamRes.headers.has("content-range")) {
        headers.set("Content-Range", upstreamRes.headers.get("content-range")!)
      }
      if (upstreamRes.headers.has("accept-ranges")) {
        headers.set("Accept-Ranges", upstreamRes.headers.get("accept-ranges")!)
      }
      if (upstreamRes.headers.has("content-length")) {
        headers.set("Content-Length", upstreamRes.headers.get("content-length")!)
      }

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers,
      })
    } catch {
      return new NextResponse("Video stream proxy error.", { status: 500 })
    }
  }

  // 5. Resolve object key or local disk path
  const key = getVideoKeyFromMarker(lesson.videoUrl, lessonId)
  if (!key) return new NextResponse("Video file not found.", { status: 404 })

  if (isLocalVideoMarker(lesson.videoUrl)) {
    if (!fs.existsSync(key)) return new NextResponse("Video file not found.", { status: 404 })

    const stat = fs.statSync(key)
    const fileSize = stat.size
    const rangeHeader = req.headers.get("range")
    const contentType = "video/mp4"

    const securityHeaders = {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    }

    const range = rangeHeader ? parseRange(rangeHeader, fileSize) : initialRange(fileSize)
    if (!range) return rangeNotSatisfiable(fileSize)
    const stream = Readable.toWeb(fs.createReadStream(key, { start: range.start, end: range.end }))

    return new NextResponse(stream as ReadableStream, {
      status: 206,
      headers: {
        ...securityHeaders,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
        "Content-Length": String(range.chunkSize),
      },
    })
  }

  // 6. Wasabi video — redirect to Gcore CDN URL if configured,
  //    otherwise fall back to proxying bytes through this server.
  const cdnUrl = generateGcoreCdnUrl(key)
  if (cdnUrl) {
    // Auth already verified above. Issue a temporary redirect to the CDN URL.
    return NextResponse.redirect(cdnUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  // Fallback: proxy stream directly from Wasabi (used in local dev where GCORE_CDN_URL or GCORE_TOKEN_KEY are not set)
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
    "Cache-Control": "private, max-age=3600",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  }

  const range = rangeHeader ? parseRange(rangeHeader, fileSize) : initialRange(fileSize)
  if (!range) return rangeNotSatisfiable(fileSize)

  const video = await getWasabiVideo(key, `bytes=${range.start}-${range.end}`)
  const stream = video.Body?.transformToWebStream()
  if (!stream) return new NextResponse("Video file not found.", { status: 404 })

  return new NextResponse(stream, {
    status: 206,
    headers: {
      ...securityHeaders,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
      "Content-Length": String(range.chunkSize),
    },
  })
}
