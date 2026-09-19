import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { internships, internshipApplications } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error("Razorpay keys not configured.")
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

/**
 * POST /api/razorpay/internship-joining-verify
 * Verifies joining fee payment and updates application status to "accepted".
 * Body: { razorpay_order_id, razorpay_payment_id?, razorpay_signature?, applicationId }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      applicationId,
    } = await req.json()

    if (!razorpay_order_id || !applicationId)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })

    const razorpay = getRazorpayClient()
    let paymentId = razorpay_payment_id

    // Verify HMAC signature if provided
    if (razorpay_payment_id && razorpay_signature) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex")
      if (expected !== razorpay_signature)
        return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 })
    }

    // If no payment ID, fetch from order
    if (!paymentId) {
      const order = await razorpay.orders.fetch(razorpay_order_id)
      if (!order || !["paid", "authorized"].includes(order.status))
        return NextResponse.json({ error: "Payment not completed." }, { status: 400 })
      const payments = await razorpay.orders.fetchPayments(razorpay_order_id)
      const success = Array.isArray(payments.items)
        ? payments.items.find((i: any) => ["captured", "authorized"].includes(i.status))
        : null
      if (!success) return NextResponse.json({ error: "No successful payment found." }, { status: 400 })
      paymentId = success.id
    }

    const appRows = await db.select().from(internshipApplications)
      .where(and(eq(internshipApplications.id, applicationId), eq(internshipApplications.userId, user.id)))
    const appRow = appRows[0]
    if (!appRow) return NextResponse.json({ error: "Application not found." }, { status: 404 })

    const internshipRows = await db.select().from(internships).where(eq(internships.id, appRow.internshipId))
    const internship = internshipRows[0]

    const now = new Date().toISOString()
    const update = {
      status: "accepted" as const,
      joiningFeeAmount: internship ? Number(internship.joiningFee || 0) : 0,
      joiningFeePaymentId: paymentId!,
      joiningFeePaidAt: now,
      updatedAt: now,
    }

    await db.update(internshipApplications).set(update).where(eq(internshipApplications.id, applicationId))
    const updated = await db.select().from(internshipApplications).where(eq(internshipApplications.id, applicationId))
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[POST /api/razorpay/internship-joining-verify]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
