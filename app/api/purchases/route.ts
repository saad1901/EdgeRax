import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, courses, communityMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import { computeExpiresAt } from "@/lib/format"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  const rows = await db.select().from(purchases).where(eq(purchases.userId, user.id))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  // Only admins may record purchases directly (e.g. manual grants).
  // Regular users must go through /api/razorpay/verify which validates payment signatures.
  if (user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  try {
    const { courseId, paymentId } = await req.json()
    if (!courseId || !paymentId)
      return NextResponse.json({ error: "courseId and paymentId required." }, { status: 400 })

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))
    if (existing.length > 0) return NextResponse.json(existing[0])

    const purchasedAt = new Date().toISOString()
    const expiresAt = computeExpiresAt(purchasedAt, course.validityDays)
    const purchase = { id: uid("pur"), userId: user.id, courseId, amount: course.price, paymentId, expiresAt }
    await db.insert(purchases).values(purchase)
    await db.update(courses).set({ students: course.students + 1 }).where(eq(courses.id, courseId))

    const existingMember = await db.select().from(communityMembers)
      .where(eq(communityMembers.userId, user.id))
    if (existingMember.length === 0) {
      await db.insert(communityMembers).values({
        id: uid("cm"),
        userId: user.id,
        status: "active",
      })
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch (err) {
    console.error("[POST /api/purchases]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
