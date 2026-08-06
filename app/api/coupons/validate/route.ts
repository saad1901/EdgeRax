import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { coupons, courses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

function roundMoney(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/**
 * POST /api/coupons/validate
 * Body: { code: string; courseId: string }
 *
 * Returns the discounted price and coupon details if valid.
 * Does NOT increment usageCount — that happens on successful payment.
 */
export async function POST(req: NextRequest) {
  const { code, courseId } = await req.json()

  if (!code?.trim() || !courseId)
    return NextResponse.json({ error: "code and courseId are required." }, { status: 400 })

  // Fetch coupon
  const couponRows = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase()))
  const coupon = couponRows[0]
  if (!coupon || !coupon.active)
    return NextResponse.json({ error: "Invalid or inactive coupon code." }, { status: 404 })

  // Check expiry
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
    return NextResponse.json({ error: "This coupon has expired." }, { status: 400 })

  // Check usage limit
  if (coupon.maxUsage > 0 && coupon.usageCount >= coupon.maxUsage)
    return NextResponse.json({ error: "This coupon has reached its usage limit." }, { status: 400 })

  // Check course scope — null courseId means valid for all courses
  if (coupon.courseId && coupon.courseId !== courseId)
    return NextResponse.json({ error: "This coupon is not valid for this course." }, { status: 400 })

  // Fetch course price
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
  const course = courseRows[0]
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

  // Calculate discounted price
  let discount = 0
  if (coupon.discountType === "percent") {
    discount = roundMoney(course.price * coupon.discountValue / 100)
  } else {
    discount = Math.min(coupon.discountValue, course.price)
  }
  const finalPrice = roundMoney(Math.max(0, course.price - discount))

  return NextResponse.json({
    valid:         true,
    couponId:      coupon.id,
    code:          coupon.code,
    discountType:  coupon.discountType,
    discountValue: coupon.discountValue,
    originalPrice: course.price,
    discount,
    finalPrice,
  })
}
