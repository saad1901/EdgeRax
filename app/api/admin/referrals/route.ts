import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { referralEarnings, users, courses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Earning = InferSelectModel<typeof referralEarnings>
type User    = InferSelectModel<typeof users>
type Course  = InferSelectModel<typeof courses>

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * GET /api/admin/referrals
 * Returns all referral earnings enriched with referrer/referred names and course title.
 */
export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [earnings, allUsers, allCourses] = await Promise.all([
    db.select().from(referralEarnings),
    db.select().from(users),
    db.select().from(courses),
  ]) as [Earning[], User[], Course[]]

  const enriched = earnings.map((e) => {
    const referrer = allUsers.find((u) => u.id === e.referrerId)
    const referred = allUsers.find((u) => u.id === e.referredId)
    const course   = allCourses.find((c) => c.id === e.courseId)
    return {
      ...e,
      referrerName:  referrer?.name  ?? "Unknown",
      referrerEmail: referrer?.email ?? "",
      referredName:  referred?.name  ?? "Unknown",
      referredEmail: referred?.email ?? "",
      courseTitle:   course?.title   ?? "Deleted course",
    }
  })

  return NextResponse.json(enriched)
}

/**
 * PATCH /api/admin/referrals
 * Body: { id: string; status: "credited" | "rejected" | "pending" }
 * Manually update the status of a referral earning.
 */
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { id, status } = await req.json()
    if (!id || !["credited", "rejected", "pending"].includes(status))
      return NextResponse.json({ error: "Valid id and status required." }, { status: 400 })

    await db.update(referralEarnings)
      .set({ status })
      .where(eq(referralEarnings.id, id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/admin/referrals]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
