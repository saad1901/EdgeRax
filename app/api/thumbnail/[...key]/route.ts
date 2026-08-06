import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { createWasabiClient, getWasabiBucket } from "@/lib/wasabi-video"

export const runtime = "nodejs"

/**
 * GET /api/thumbnail/<key>
 * Proxy-serves a thumbnail image from Wasabi.
 * Thumbnails are stored privately; this route streams them to the browser.
 * Long cache: thumbnails never change once uploaded.
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
        // Thumbnails are immutable once uploaded — cache aggressively
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Not found.", { status: 404 })
  }
}
