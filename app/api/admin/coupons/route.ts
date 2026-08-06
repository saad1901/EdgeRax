import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { coupons, courses } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const allCoupons = await db.select().from(coupons).orderBy(asc(coupons.createdAt))
  const allCourses = await db.select({ id: courses.id, title: courses.title }).from(courses)
  const courseMap = new Map<string, string>(allCourses.map((c: { id: string; title: string }) => [c.id, c.title]))

  return NextResponse.json(allCoupons.map((c: { courseId: string | null } & Record<string, any>) => ({
    ...c,
    courseTitle: c.courseId ? (courseMap.get(c.courseId) ?? "Unknown course") : null,
  })))
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const body = await req.json()
  const { code, courseId, discountType, discountValue, maxUsage, expiresAt, active } = body

  if (!code?.trim()) return NextResponse.json({ error: "Coupon code is required." }, { status: 400 })
  if (!["percent", "amount"].includes(discountType))
    return NextResponse.json({ error: "discountType must be 'percent' or 'amount'." }, { status: 400 })
  if (!discountValue || Number(discountValue) <= 0)
    return NextResponse.json({ error: "discountValue must be greater than 0." }, { status: 400 })
  if (discountType === "percent" && Number(discountValue) > 100)
    return NextResponse.json({ error: "Percent discount cannot exceed 100." }, { status: 400 })

  // Validate courseId if provided
  if (courseId) {
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    if (!courseRows[0]) return NextResponse.json({ error: "Course not found." }, { status: 400 })
  }

  const coupon = {
    id:            uid("cpn"),
    code:          code.trim().toUpperCase(),
    courseId:      courseId || null,
    discountType:  discountType as "percent" | "amount",
    discountValue: Number(discountValue),
    maxUsage:      Number(maxUsage) || 0,
    usageCount:    0,
    expiresAt:     expiresAt || null,
    active:        active !== false,
  }

  try {
    await db.insert(coupons).values(coupon)
    return NextResponse.json(coupon, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes("Duplicate")) {
      return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 })
    }
    console.error("[POST /api/admin/coupons]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
