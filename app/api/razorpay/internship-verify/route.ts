import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
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
 * POST /api/razorpay/internship-verify
 * Verifies payment and creates the internship application.
 * Body: {
 *   razorpay_order_id, razorpay_payment_id?, razorpay_signature?,
 *   internshipId, resumeUrl, coverLetter?
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      internshipId,
      resumeUrl,
      coverLetter = "",
    } = await req.json()

    if (!razorpay_order_id || !internshipId)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    if (!resumeUrl?.trim())
      return NextResponse.json({ error: "Resume is required." }, { status: 400 })

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

    // Verify internship exists
    const internshipRows = await db.select().from(internships).where(eq(internships.id, internshipId))
    const internship = internshipRows[0]
    if (!internship) return NextResponse.json({ error: "Internship not found." }, { status: 404 })

    // Idempotency
    const existing = await db.select().from(internshipApplications)
      .where(and(eq(internshipApplications.userId, user.id), eq(internshipApplications.internshipId, internshipId)))
    if (existing.length > 0) return NextResponse.json(existing[0])

    const now = new Date().toISOString()
    const application = {
      id:           uid("app"),
      internshipId,
      userId:       user.id,
      amount:       Number(internship.applicationFee),
      paymentId:    paymentId!,
      paidAt:       now,
      resumeUrl:    resumeUrl.trim(),
      coverLetter:  coverLetter.trim(),
      status:       "pending" as const,
      adminNote:    "",
      updatedAt:    now,
    }
    await db.insert(internshipApplications).values(application)
    return NextResponse.json(application, { status: 201 })
  } catch (err) {
    console.error("[POST /api/razorpay/internship-verify]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
