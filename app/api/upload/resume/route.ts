import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getCurrentUser } from "@/lib/auth"

const RESUME_DIR = path.join(process.cwd(), "storage", "resumes")
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["application/pdf"]

/**
 * POST /api/upload/resume
 * Multipart: { file: File }
 * Returns: { ok: true, url: "/api/upload/resume/<filename>" }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "file is required." }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Only PDF resumes are accepted." }, { status: 415 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "Resume exceeds 5 MB limit." }, { status: 413 })

    fs.mkdirSync(RESUME_DIR, { recursive: true })
    const safeName = `${user.id}-${Date.now()}.pdf`
    const dest = path.join(RESUME_DIR, safeName)
    fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ ok: true, url: `/api/upload/resume/${safeName}` })
  } catch (err) {
    console.error("[POST /api/upload/resume]", err)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}

/**
 * GET /api/upload/resume/[filename]
 * Serves the resume PDF — only accessible to the owner or admin.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized.", { status: 401 })

  const filename = req.nextUrl.pathname.split("/").pop()
  if (!filename) return new NextResponse("Not found.", { status: 404 })

  const filePath = path.join(RESUME_DIR, filename)
  if (!fs.existsSync(filePath)) return new NextResponse("Not found.", { status: 404 })

  // Only admin or the owner can view it (filename starts with userId)
  const ownerPrefix = filename.split("-")[0]
  if (user.role !== "admin" && !filename.startsWith(user.id + "-")) {
    return new NextResponse("Forbidden.", { status: 403 })
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  })
}
