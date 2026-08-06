import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { courses, purchases, referralCodes, referralEarnings, referralSettings, users, coupons } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { uid } from "@/lib/auth"
import { computeExpiresAt } from "@/lib/format"
import { recordAllocations } from "@/lib/allocations"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined.")
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const expectedSignature = req.headers.get("x-razorpay-signature")
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[Razorpay Webhook] Missing RAZORPAY_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 })
  }

  if (!expectedSignature) {
    console.warn("[Razorpay Webhook] Missing x-razorpay-signature header")
    return NextResponse.json({ error: "Missing Razorpay signature." }, { status: 400 })
  }

  const generatedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex")

  console.info("[Razorpay Webhook] received", {
    event: undefined,
    signaturePresent: Boolean(expectedSignature),
    signatureLength: expectedSignature?.length ?? 0,
  })

  try {
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(generatedSignature),
    )
    if (!signaturesMatch) {
      console.error("[Razorpay Webhook] Signature mismatch")
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
    }
  } catch {
    console.error("[Razorpay Webhook] Signature comparison failed")
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error("[Razorpay Webhook] Invalid JSON payload", rawBody)
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 })
  }

  console.info("[Razorpay Webhook] parsed event", {
    event: event?.event,
    paymentId: event?.payload?.payment?.entity?.id,
    orderId: event?.payload?.payment?.entity?.order_id ?? event?.payload?.order?.entity?.id,
  })

  const supportedEvents = ["payment.captured", "payment.authorized", "order.paid"]
  if (!supportedEvents.includes(event?.event)) {
    console.info("[Razorpay Webhook] ignored event", { event: event?.event })
    return NextResponse.json({ received: true })
  }

  const payment = event?.payload?.payment?.entity
  const orderId = payment?.order_id ?? event?.payload?.order?.entity?.id
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id in webhook payload." }, { status: 400 })
  }

  try {
    const razorpay = getRazorpayClient()
    const order = await razorpay.orders.fetch(orderId)
    const courseId = String(order?.notes?.courseId ?? "")
    const userId = String(order?.notes?.userId ?? "")

    if (!courseId || !userId) {
      console.warn("[Razorpay Webhook] Missing course/user notes in order", { orderId, notes: order?.notes })
      return NextResponse.json({ error: "Missing course/user notes in Razorpay order." }, { status: 400 })
    }

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 })
    }

    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    if (existing.length > 0) {
      return NextResponse.json({ received: true, alreadyRecorded: true })
    }

    // ── Resolve coupon discount (stored in order notes) ───────────────────────
    let paidAmount = course.price
    let appliedCouponId: string | null = null
    const couponCode = String(order?.notes?.couponCode ?? "").trim().toUpperCase()

    if (couponCode) {
      const couponRows = await db.select().from(coupons)
        .where(eq(coupons.code, couponCode))
      const coupon = couponRows[0]
      const isValid =
        coupon &&
        coupon.active &&
        (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) &&
        (coupon.maxUsage === 0 || coupon.usageCount < coupon.maxUsage) &&
        (!coupon.courseId || coupon.courseId === courseId)

      if (isValid) {
        const discount = coupon.discountType === "percent"
          ? Math.round(course.price * coupon.discountValue / 100 * 100) / 100
          : Math.min(coupon.discountValue, course.price)
        paidAmount = Math.round(Math.max(0, course.price - discount) * 100) / 100
        appliedCouponId = coupon.id
      }
    }

    const purchasedAt = new Date().toISOString()
    const expiresAt = computeExpiresAt(purchasedAt, course.validityDays)
    const purchase = {
      id: uid("pur"),
      userId,
      courseId,
      amount: paidAmount,
      paymentId: payment?.id ?? "webhook",
      expiresAt,
    }

    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    // ── Increment coupon usage ────────────────────────────────────────────────
    if (appliedCouponId) {
      await db.update(coupons)
        .set({ usageCount: sql`usage_count + 1` })
        .where(eq(coupons.id, appliedCouponId))
    }

    // Process referral if a referral code was stored in the order notes
    const referralCode = String(order?.notes?.referralCode ?? "").trim().toUpperCase()
    let referrerId: string | null = null
    if (referralCode) {
      referrerId = await processReferral({ referralCode, buyerId: userId, courseId, paidAmount })
    }

    // ── Snapshot allocations (immutable, time-of-purchase rates) ─────────────
    await recordAllocations({
      purchaseId:   purchase.id,
      courseId,
      paidAmount,
      instructorId: course.instructorId ?? null,
      referrerId,
    })

    console.info("[Razorpay Webhook] recorded purchase", { userId, courseId, paymentId: purchase.paymentId })
    return NextResponse.json({ received: true, recorded: true })
  } catch (err) {
    console.error("[Razorpay Webhook] processing failed", err)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}

/**
 * Award a referral earning on webhook-confirmed purchases.
 *
 * Reward calculation (percentage-based):
 *   reward = (coursePrice × rewardPercent) / 100
 *
 * Stored at purchase time — future % changes do NOT affect existing earnings.
 */
async function processReferral({
  referralCode,
  buyerId,
  courseId,
  paidAmount,
}: {
  referralCode: string
  buyerId: string
  courseId: string
  paidAmount: number
}): Promise<string | null> {
  try {
    const codeRows = await db.select().from(referralCodes).where(eq(referralCodes.code, referralCode))
    const referrerCode = codeRows[0]
    if (!referrerCode || referrerCode.userId === buyerId) return null

    const referrerId = referrerCode.userId

    const alreadyEarned = await db.select().from(referralEarnings)
      .where(and(eq(referralEarnings.referredId, buyerId), eq(referralEarnings.courseId, courseId)))
    if (alreadyEarned.length > 0) return null

    const settingsRows = await db.select().from(referralSettings).where(eq(referralSettings.id, "global"))
    const cfg = settingsRows[0]
    if (!cfg) return null

    if (cfg.maxReferrals > 0) {
      const earnCount = await db.select().from(referralEarnings)
        .where(eq(referralEarnings.referrerId, referrerId))
      if (earnCount.length >= cfg.maxReferrals) return null
    }

    const referrerRows = await db.select().from(users).where(eq(users.id, referrerId))
    const referrer = referrerRows[0]
    const pct = referrer?.referralPercent != null
      ? Number(referrer.referralPercent)
      : (cfg.rewardPercent ?? 10)

    const rewardAmount = Math.round((paidAmount * pct / 100) * 100) / 100

    await db.insert(referralEarnings).values({
      id: uid("earn"),
      referrerId,
      referredId: buyerId,
      courseId,
      amount: rewardAmount,
      status: cfg.autoCredit ? "credited" : "pending",
    })

    return referrerId
  } catch (err) {
    console.error("[Webhook processReferral]", err)
    return null
  }
}
