import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { internships, internshipApplications } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error("Razorpay keys not configured.")
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

/**
 * POST /api/razorpay/internship-joining-order
 * Body: { applicationId: string }
 * Creates a Razorpay order for the internship joining fee.
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
      return NextResponse.json({ error: "Joining fee can only be paid for offered internships." }, { status: 400 })
    }

    const internshipRows = await db.select().from(internships).where(eq(internships.id, appRow.internshipId))
    const internship = internshipRows[0]
    if (!internship) return NextResponse.json({ error: "Internship not found." }, { status: 404 })

    const joiningFee = Number(internship.joiningFee || 0)
    if (joiningFee <= 0) {
      return NextResponse.json({ error: "This internship has no joining fee." }, { status: 400 })
    }

    const amountInPaise = Math.max(1, Math.round(joiningFee * 100))
    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  uid("rcpt_j"),
      notes: { applicationId, internshipId: internship.id, userId: user.id, type: "joining_fee" },
    })

    return NextResponse.json({
      orderId:         order.id,
      amount:          order.amount,
      currency:        order.currency,
      internshipTitle: internship.title,
      joiningFee,
      userName:        user.name,
      userEmail:       user.email,
    })
  } catch (err) {
    console.error("[POST /api/razorpay/internship-joining-order]", err)
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 })
  }
}
