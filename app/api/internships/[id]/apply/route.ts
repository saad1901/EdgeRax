import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships, internshipApplications } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

/**
 * POST /api/internships/[id]/apply
 * Auth required.
 * For paid internships: submit after Razorpay payment is verified via /api/razorpay/internship-verify
 * For free internships: body: { resumeUrl: string; coverLetter?: string }
 *
 * Body: { resumeUrl: string; coverLetter?: string; paymentId?: string; razorpay_order_id?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { id } = await params

  try {
    const internshipRows = await db.select().from(internships).where(eq(internships.id, id))
    const internship = internshipRows[0]
    if (!internship) return NextResponse.json({ error: "Internship not found." }, { status: 404 })
    if (internship.status === "closed") return NextResponse.json({ error: "Applications are closed for this internship." }, { status: 400 })
    if (internship.lastDateToApply && new Date(internship.lastDateToApply) < new Date())
      return NextResponse.json({ error: "The application deadline has passed." }, { status: 400 })

    // Idempotency
    const existing = await db.select().from(internshipApplications)
      .where(and(eq(internshipApplications.userId, user.id), eq(internshipApplications.internshipId, id)))
    if (existing.length > 0)
      return NextResponse.json({ error: "You have already applied for this internship." }, { status: 409 })

    const { resumeUrl, coverLetter = "", paymentId = "" } = await req.json()
    if (!resumeUrl?.trim())
      return NextResponse.json({ error: "Resume is required." }, { status: 400 })

    // If there's a fee, paymentId is required
    if (Number(internship.applicationFee) > 0 && !paymentId.trim())
      return NextResponse.json({ error: "Payment is required before applying." }, { status: 400 })

    const now = new Date().toISOString()
    const application = {
      id:           uid("app"),
      internshipId: id,
      userId:       user.id,
      amount:       Number(internship.applicationFee),
      paymentId:    paymentId.trim(),
      paidAt:       paymentId.trim() ? now : null,
      resumeUrl:    resumeUrl.trim(),
      coverLetter:  coverLetter.trim(),
      status:       "pending" as const,
      adminNote:    "",
      updatedAt:    now,
    }
    await db.insert(internshipApplications).values(application)
    return NextResponse.json(application, { status: 201 })
  } catch (err) {
    console.error("[POST /api/internships/[id]/apply]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
