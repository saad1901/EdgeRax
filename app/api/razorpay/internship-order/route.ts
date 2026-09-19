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
 * POST /api/razorpay/internship-order
 * Body: { internshipId: string }
 * Creates a Razorpay order for the internship application fee.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { internshipId } = await req.json()
    if (!internshipId) return NextResponse.json({ error: "internshipId is required." }, { status: 400 })

    const internshipRows = await db.select().from(internships).where(eq(internships.id, internshipId))
    const internship = internshipRows[0]
    if (!internship) return NextResponse.json({ error: "Internship not found." }, { status: 404 })
    if (Number(internship.applicationFee) <= 0)
      return NextResponse.json({ error: "This internship has no application fee." }, { status: 400 })

    // Already applied?
    const existing = await db.select().from(internshipApplications)
      .where(and(eq(internshipApplications.userId, user.id), eq(internshipApplications.internshipId, internshipId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Already applied." }, { status: 409 })

    const amountInPaise = Math.max(1, Math.round(Number(internship.applicationFee) * 100))
    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  uid("rcpt"),
      notes: { internshipId, userId: user.id },
    })

    return NextResponse.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      internshipTitle: internship.title,
      fee:       Number(internship.applicationFee),
      userName:  user.name,
      userEmail: user.email,
    })
  } catch (err) {
    console.error("[POST /api/razorpay/internship-order]", err)
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 })
  }
}
