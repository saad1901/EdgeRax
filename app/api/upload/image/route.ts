import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"

const IMAGE_DIR = path.join(process.cwd(), "storage", "community")
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "file is required." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 415 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image exceeds 5 MB limit." }, { status: 413 })
    }

    fs.mkdirSync(IMAGE_DIR, { recursive: true })
    const ext = path.extname(file.name) || ".png"
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const dest = path.join(IMAGE_DIR, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(dest, buffer)

    const publicUrl = `/api/upload/image/${filename}`
    return NextResponse.json({ ok: true, url: publicUrl })
  } catch (error) {
    console.error("[POST /api/upload/image]", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.pathname.split("/").pop()
  if (!filename) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const filePath = path.join(IMAGE_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/*",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

export const config = {
  api: { bodyParser: false },
}
