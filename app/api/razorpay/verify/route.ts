import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { courses, purchases, referralCodes, referralEarnings, referralSettings, communityMembers, coupons, users } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
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

/**
 * POST /api/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id?, razorpay_signature?, courseId, referralCode?, couponCode? }
 *
 * Verifies a successful Razorpay payment, records the purchase, increments
 * coupon usage if applied, and processes referral earnings.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      referralCode,
      couponCode,
    } = await req.json()

    if (!razorpay_order_id || !courseId)
      return NextResponse.json({ error: "Missing required payment fields." }, { status: 400 })

    const razorpay = getRazorpayClient()
    let paymentId = razorpay_payment_id

    if (razorpay_payment_id && razorpay_signature) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex")

      if (expected !== razorpay_signature)
        return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 })
    }

    if (!paymentId) {
      const order = await razorpay.orders.fetch(razorpay_order_id)
      const successfulOrderStatuses = ["paid", "authorized"]
      const successfulPaymentStatuses = ["captured", "authorized"]

      if (!order || !successfulOrderStatuses.includes(order.status))
        return NextResponse.json({ error: "Payment not completed yet." }, { status: 400 })

      const payments = await razorpay.orders.fetchPayments(razorpay_order_id)
      const successfulPayment = Array.isArray(payments.items)
        ? payments.items.find((item: any) => successfulPaymentStatuses.includes(item.status))
        : null

      if (!successfulPayment)
        return NextResponse.json({ error: "No successful payment found for this order." }, { status: 400 })

      paymentId = successfulPayment.id
    }

    // ── Fetch course ─────────────────────────────────────────────────────────
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // ── Idempotency: already purchased? ──────────────────────────────────────
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
    if (existing.length > 0) return NextResponse.json(existing[0])

    // ── Resolve coupon discount ───────────────────────────────────────────────
    let paidAmount = course.price
    let appliedCouponId: string | null = null

    if (couponCode?.trim()) {
      const couponRows = await db.select().from(coupons)
        .where(eq(coupons.code, couponCode.trim().toUpperCase()))
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

    // ── Record purchase ───────────────────────────────────────────────────────
    const purchasedAt = new Date().toISOString()
    const expiresAt = computeExpiresAt(purchasedAt, course.validityDays)
    const purchase = {
      id:        uid("pur"),
      userId:    user.id,
      courseId,
      amount:    paidAmount,
      paymentId: paymentId!,
      expiresAt,
    }
    await db.insert(purchases).values(purchase)
    await db.update(courses).set({ students: course.students + 1 }).where(eq(courses.id, courseId))

    // ── Increment coupon usage ────────────────────────────────────────────────
    if (appliedCouponId) {
      await db.update(coupons)
        .set({ usageCount: sql`usage_count + 1` })
        .where(eq(coupons.id, appliedCouponId))
    }

    // ── Community membership ──────────────────────────────────────────────────
    const existingMember = await db.select().from(communityMembers)
      .where(eq(communityMembers.userId, user.id))
    if (existingMember.length === 0) {
      await db.insert(communityMembers).values({ id: uid("cm"), userId: user.id, status: "active" })
    }

    // ── Process referral ──────────────────────────────────────────────────────
    let referrerId: string | null = null
    if (referralCode?.trim()) {
      referrerId = await processReferral({
        referralCode: referralCode.trim().toUpperCase(),
        buyerId: user.id,
        courseId,
        paidAmount,
      })
    }

    // ── Snapshot allocations (immutable, time-of-purchase rates) ─────────────
    await recordAllocations({
      purchaseId:  purchase.id,
      courseId,
      paidAmount,
      instructorId: course.instructorId ?? null,
      referrerId,
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (err) {
    console.error("[POST /api/razorpay/verify]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/**
 * Award a referral earning to the referrer when the buyer purchases a course.
 *
 * Reward calculation (percentage-based):
 *   reward = (coursePrice × rewardPercent) / 100
 *
 * Rules:
 * - The referral code must belong to a real user (not the buyer).
 * - The buyer must not have been referred for this course already.
 * - The referrer must not have hit their max referral limit (if set).
 * - The calculated reward is stored at purchase time — future % changes
 *   do NOT affect existing earnings.
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
    const codeRows = await db.select().from(referralCodes)
      .where(eq(referralCodes.code, referralCode))
    const referrerCode = codeRows[0]
    if (!referrerCode || referrerCode.userId === buyerId) return null

    const referrerId = referrerCode.userId

    const alreadyEarned = await db.select().from(referralEarnings)
      .where(and(
        eq(referralEarnings.referredId, buyerId),
        eq(referralEarnings.courseId, courseId),
      ))
    if (alreadyEarned.length > 0) return null

    const settingsRows = await db.select().from(referralSettings)
      .where(eq(referralSettings.id, "global"))
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
      id:         uid("earn"),
      referrerId,
      referredId: buyerId,
      courseId,
      amount:     rewardAmount,
      status:     cfg.autoCredit ? "credited" : "pending",
    })

    return referrerId
  } catch (err) {
    console.error("[processReferral]", err)
    return null
  }
}
