import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const IMAGE_DIR = path.join(process.cwd(), "storage", "community")

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
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
