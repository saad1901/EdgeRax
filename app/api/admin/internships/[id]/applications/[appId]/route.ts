import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships, internshipApplications, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { generateOfferLetterPdf, sendOfferLetterEmail } from "@/lib/offer-letter"
import { getAppUrl } from "@/lib/mail"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/**
 * PATCH /api/admin/internships/[id]/applications/[appId]
 * Admin updates an application status and optionally generates/sends offer letter.
 * Body: { status: "pending" | "offered" | "accepted" | "rejected"; adminNote?: string; sendOfferEmail?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id, appId } = await params
  const appRows = await db.select().from(internshipApplications)
    .where(and(eq(internshipApplications.id, appId), eq(internshipApplications.internshipId, id)))
  const appRow = appRows[0]
  if (!appRow) return NextResponse.json({ error: "Application not found." }, { status: 404 })

  const body = await req.json()
  const { status, adminNote, sendOfferEmail = true } = body
  const allowed = ["pending", "offered", "accepted", "rejected"]
  if (status && !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const update: Record<string, any> = { updatedAt: now }
  if (status) update.status = status
  if (adminNote !== undefined) update.adminNote = adminNote

  // If status changed to 'offered' or offer requested
  if (status === "offered" || (status === "accepted" && !appRow.offerLetterUrl)) {
    const internshipRows = await db.select().from(internships).where(eq(internships.id, id))
    const internship = internshipRows[0]

    const userRows = await db.select().from(users).where(eq(users.id, appRow.userId))
    const applicant = userRows[0]

    if (internship && applicant) {
      try {
        const offerData = {
          applicationId: appId,
          applicantName: applicant.name,
          applicantEmail: applicant.email,
          internshipTitle: internship.title,
          domain: internship.domain,
          duration: internship.duration,
          stipend: internship.stipend,
          joiningFee: Number(internship.joiningFee || 0),
          startDate: internship.startDate,
          adminNote: adminNote ?? appRow.adminNote,
        }

        // Generate PDF offer letter
        const pdfUrl = await generateOfferLetterPdf(offerData)
        update.offerLetterUrl = pdfUrl
        update.offerSentAt = now

        // Send email if enabled
        if (sendOfferEmail) {
          let appUrl = "http://localhost:3000"
          try { appUrl = getAppUrl() } catch { if (process.env.APP_URL) appUrl = process.env.APP_URL }
          await sendOfferLetterEmail(offerData, appUrl)
        }
      } catch (err) {
        console.error("[Offer Letter Generation Error]", err)
      }
    }
  }

  await db.update(internshipApplications).set(update).where(eq(internshipApplications.id, appId))
  const updated = await db.select().from(internshipApplications).where(eq(internshipApplications.id, appId))
  return NextResponse.json(updated[0])
}
