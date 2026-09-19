import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases, referralCodes, referralEarnings, referralSettings } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import { computeExpiresAt } from "@/lib/format"
import { recordAllocations } from "@/lib/allocations"

/**
 * POST /api/admin/giveaway
 * Body: { userId, courseId, amount?, paymentMode?: "free" | "cash" }
 *
 * - "free"  → amount = 0, paymentId = "giveaway"
 * - "cash"  → amount = body.amount (offline payment), paymentId = "cash-offline"
 *             Instructor commission is automatically recorded as a credited
 *             referral-style earning so their revenue totals stay accurate.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { userId, courseId, paymentMode = "cash", amount: rawAmount, referrerId } = await req.json()
    if (!userId || !courseId)
      return NextResponse.json({ error: "userId and courseId are required." }, { status: 400 })

    const isFree = paymentMode === "free"
    const amount = isFree ? 0 : Math.max(0, Number(rawAmount) || 0)

    if (!isFree && amount <= 0)
      return NextResponse.json({ error: "Enter a valid amount for cash payment." }, { status: 400 })

    // Verify user
    const userRows = await db.select().from(users).where(eq(users.id, userId))
    const targetUser = userRows[0]
    if (!targetUser)
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    if (targetUser.role === "admin")
      return NextResponse.json({ error: "Cannot grant access to admin accounts." }, { status: 400 })

    // Verify course
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course)
      return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // Already enrolled?
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    if (existing.length > 0)
      return NextResponse.json({ error: "Student is already enrolled in this course." }, { status: 409 })

    const purchasedAt = new Date().toISOString()
    const expiresAt   = computeExpiresAt(purchasedAt, course.validityDays)

    // Resolve referrer & process referral calculations BEFORE inserting allocations
    let cleanReferrerId: string | null = null
    if (!isFree && amount > 0 && referrerId && referrerId !== "") {
      if (referrerId === userId) {
        return NextResponse.json({ error: "A user cannot refer themselves." }, { status: 400 })
      }

      // Check if referrer exists
      const referrerRows = await db.select().from(users).where(eq(users.id, referrerId))
      const referrerUser = referrerRows[0]
      if (!referrerUser) {
        return NextResponse.json({ error: "Referrer user not found." }, { status: 404 })
      }

      // Check if already referred for this course
      const alreadyEarned = await db.select().from(referralEarnings)
        .where(and(
          eq(referralEarnings.referredId, userId),
          eq(referralEarnings.courseId, courseId),
        ))
      if (alreadyEarned.length > 0) {
        return NextResponse.json({ error: "This student is already referred for this course." }, { status: 400 })
      }

      // Get or create referral code for referrer
      let codeRows = await db.select().from(referralCodes).where(eq(referralCodes.userId, referrerId))
      if (codeRows.length === 0) {
        const newCode = uid("ref").replace(/-/g, "").slice(0, 12).toUpperCase()
        await db.insert(referralCodes).values({ id: uid("rc"), userId: referrerId, code: newCode })
      }

      // Get settings
      const settingsRows = await db.select().from(referralSettings).where(eq(referralSettings.id, "global"))
      const cfg = settingsRows[0]
      if (!cfg) {
        return NextResponse.json({ error: "Referral settings not found." }, { status: 500 })
      }

      if (cfg.maxReferrals > 0) {
        const earnCount = await db.select().from(referralEarnings)
          .where(eq(referralEarnings.referrerId, referrerId))
        if (earnCount.length >= cfg.maxReferrals) {
          return NextResponse.json({ error: "Referrer has reached their maximum referral limit." }, { status: 400 })
        }
      }

      const pct = referrerUser.referralPercent != null
        ? Number(referrerUser.referralPercent)
        : (cfg.rewardPercent ?? 10)

      const rewardAmount = Math.round((amount * pct / 100) * 100) / 100

      await db.insert(referralEarnings).values({
        id:         uid("earn"),
        referrerId,
        referredId: userId,
        courseId,
        amount:     rewardAmount,
        status:     cfg.autoCredit ? "credited" : "pending",
      })

      cleanReferrerId = referrerId
    }

    // Insert purchase
    const purchase = {
      id:          uid("pur"),
      userId,
      courseId,
      amount,
      paymentId:   isFree ? "giveaway" : "cash-offline",
      purchasedAt,
      expiresAt,
    }
    await db.insert(purchases).values(purchase)
    await db.update(courses)
      .set({ students: course.students + 1 })
      .where(eq(courses.id, courseId))

    // For cash payments: snapshot allocations (instructor commission + revenue shares + referral)
    if (!isFree && amount > 0) {
      await recordAllocations({
        purchaseId:   purchase.id,
        courseId,
        paidAmount:   amount,
        instructorId: course.instructorId ?? null,
        referrerId:   cleanReferrerId,
      })
    }

    return NextResponse.json({ ok: true, purchase }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/giveaway]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
