import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getCourseManager } from "@/lib/course-access"
import { createWasabiClient, getWasabiBucket } from "@/lib/wasabi-video"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const THUMBNAIL_PREFIX = "thumbnails/"

export const runtime = "nodejs"

/** POST /api/upload/thumbnail
 *  Body: FormData { file: File }
 *  Uploads image to Wasabi (private) and returns a proxy URL /api/thumbnail/<key>
 *  so no public bucket ACL is required.
 */
export async function POST(req: NextRequest) {
  const manager = await getCourseManager()
  if (!manager) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "file is required." }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 415 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image exceeds 5 MB limit." }, { status: 413 })
    }

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/gif"  ? "gif"
      : "jpg"

    const key = `${THUMBNAIL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bucket = getWasabiBucket()
    const client = createWasabiClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
    }))

    // Return a proxy URL — the browser fetches it through our API,
    // no public bucket ACL needed.
    const url = `/api/thumbnail/${encodeURIComponent(key)}`
    return NextResponse.json({ ok: true, url })
  } catch (err: any) {
    console.error("[POST /api/upload/thumbnail]", JSON.stringify({
      name: err?.name,
      code: err?.Code || err?.code,
      message: err?.message,
      status: err?.$metadata?.httpStatusCode,
    }))
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

export const config = {
  api: { bodyParser: false },
}
