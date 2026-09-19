import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { buildGcoreCdnUrl, createWasabiClient, getGcoreCdnBaseUrl, getWasabiBucket } from "@/lib/wasabi-video"

export const runtime = "nodejs"

/**
 * GET /api/thumbnail/<key>
 * If Gcore CDN is configured, issues a 302 redirect to the CDN URL so the
 * browser fetches the image directly from the edge — no proxying overhead.
 * Falls back to streaming from Wasabi when CDN is not configured.
 * Thumbnails are immutable once uploaded — cached aggressively.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params
  // Reconstruct the full object key (may contain slashes)
  const key = segments.map(decodeURIComponent).join("/")

  if (!key.startsWith("thumbnails/")) {
    return new NextResponse("Not found.", { status: 404 })
  }

  // Redirect to CDN if configured
  if (getGcoreCdnBaseUrl()) {
    const cdnUrl = buildGcoreCdnUrl(key)
    return NextResponse.redirect(cdnUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  }

  // Fallback: proxy from Wasabi
  try {
    const client = createWasabiClient()
    const obj = await client.send(new GetObjectCommand({
      Bucket: getWasabiBucket(),
      Key: key,
    }))

    const stream = obj.Body?.transformToWebStream()
    if (!stream) return new NextResponse("Not found.", { status: 404 })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": obj.ContentType || "image/jpeg",
        "Content-Length": String(obj.ContentLength ?? ""),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Not found.", { status: 404 })
  }
}
