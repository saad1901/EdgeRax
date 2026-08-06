import { NextRequest, NextResponse } from "next/server"
import Razorpay from "razorpay"
import { db } from "@/lib/db"
import { courses, purchases, coupons } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined.")
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

function roundMoney(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/**
 * POST /api/razorpay/order
 * Body: { courseId: string; referralCode?: string; couponCode?: string }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { courseId, referralCode, couponCode } = await req.json()
    if (!courseId)
      return NextResponse.json({ error: "courseId is required." }, { status: 400 })

    // Fetch course
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // Already purchased?
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Course already purchased." }, { status: 409 })

    // Apply coupon discount if provided
    let finalPrice = course.price
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
          ? roundMoney(course.price * coupon.discountValue / 100)
          : Math.min(coupon.discountValue, course.price)
        finalPrice = roundMoney(Math.max(0, course.price - discount))
        appliedCouponId = coupon.id
      }
    }

    // Razorpay amounts are in paise (smallest unit). Minimum 1 paisa.
    const amountInPaise = Math.max(1, Math.round(finalPrice * 100))
    const razorpay = getRazorpayClient()

    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  uid("rcpt"),
      notes: {
        courseId,
        userId: user.id,
        finalPrice: String(finalPrice),
        ...(appliedCouponId ? { couponId: appliedCouponId } : {}),
        ...(referralCode?.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      },
    })

    return NextResponse.json({
      orderId:    order.id,
      amount:     order.amount,
      currency:   order.currency,
      courseName: course.title,
      coursePrice: course.price,
      finalPrice,
      appliedCouponId,
      userName:   user.name,
      userEmail:  user.email,
    })
  } catch (err) {
    console.error("[POST /api/razorpay/order]", err)
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 })
  }
}
