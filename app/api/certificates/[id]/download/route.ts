import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { db } from "@/lib/db"
import { certificates } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"

/**
 * GET /api/certificates/[id]/download
 * Streams the certificate PDF to the browser.
 * Accessible by the owning student or any admin.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  // Extract the certificate id from the URL path
  const parts = req.nextUrl.pathname.split("/").filter(Boolean)
  // path: api / certificates / [id] / download
  const id = parts[parts.length - 2]

  if (!id) return NextResponse.json({ error: "Certificate id missing." }, { status: 400 })

  const rows = await db.select().from(certificates).where(eq(certificates.id, id))
  const cert = rows[0]
  if (!cert) return NextResponse.json({ error: "Certificate not found." }, { status: 404 })

  // Only the owner or an admin may download
  if (cert.userId !== user.id && user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  if (!cert.pdfPath || !fs.existsSync(cert.pdfPath))
    return NextResponse.json({ error: "Certificate file not found on server." }, { status: 404 })

  const data = await fs.promises.readFile(cert.pdfPath)

  const safeCourseName = cert.courseId.replace(/[^a-z0-9]/gi, "-")
  const filename = `certificate-${cert.certificateNumber}-${safeCourseName}.pdf`

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
