import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { db } from "@/lib/db"
import { internshipApplications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

const OFFER_DIR = path.join(process.cwd(), "storage", "offer-letters")

/**
 * GET /api/offer-letter/[appId]
 * Serves the PDF offer letter for the given application.
 * Accessible only to the applicant user or an admin.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  const { appId } = await params
  const rows = await db.select().from(internshipApplications).where(eq(internshipApplications.id, appId))
  const appRow = rows[0]
  if (!appRow) return new NextResponse("Application not found", { status: 404 })

  if (user.role !== "admin" && appRow.userId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const filePath = path.join(OFFER_DIR, `offer-${appId}.pdf`)
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Offer letter file not found", { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Offer_Letter_${appId}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  })
}
