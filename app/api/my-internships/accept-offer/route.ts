import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships, internshipApplications } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * POST /api/my-internships/accept-offer
 * Candidate accepts an offer when there is no joining fee (joiningFee === 0).
 * Body: { applicationId: string }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { applicationId } = await req.json()
    if (!applicationId) return NextResponse.json({ error: "applicationId is required." }, { status: 400 })

    const appRows = await db.select().from(internshipApplications)
      .where(and(eq(internshipApplications.id, applicationId), eq(internshipApplications.userId, user.id)))
    const appRow = appRows[0]
    if (!appRow) return NextResponse.json({ error: "Application not found." }, { status: 404 })

    if (appRow.status !== "offered") {
      return NextResponse.json({ error: "Offer cannot be accepted in current state." }, { status: 400 })
    }

    const internshipRows = await db.select().from(internships).where(eq(internships.id, appRow.internshipId))
    const internship = internshipRows[0]
    const joiningFee = internship ? Number(internship.joiningFee || 0) : 0

    if (joiningFee > 0) {
      return NextResponse.json({ error: "Joining fee payment is required to accept this offer." }, { status: 400 })
    }

    const now = new Date().toISOString()
    await db.update(internshipApplications)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(internshipApplications.id, applicationId))

    const updated = await db.select().from(internshipApplications).where(eq(internshipApplications.id, applicationId))
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[POST /api/my-internships/accept-offer]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
