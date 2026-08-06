import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { referralCodes, referralEarnings, users, courses, referralSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Earning = InferSelectModel<typeof referralEarnings>
type User    = InferSelectModel<typeof users>
type Course  = InferSelectModel<typeof courses>

/**
 * GET /api/referral
 * Returns the current user's referral code and their earning history,
 * enriched with referred user names and course titles.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  // Get or create referral code for this user
  let codeRows = await db.select().from(referralCodes).where(eq(referralCodes.userId, user.id))
  if (codeRows.length === 0) {
    const newCode = uid("ref").replace(/-/g, "").slice(0, 12).toUpperCase()
    await db.insert(referralCodes).values({ id: uid("rc"), userId: user.id, code: newCode })
    codeRows = await db.select().from(referralCodes).where(eq(referralCodes.userId, user.id))
  }
  const code = codeRows[0].code

  // Get earnings for this referrer
  const earnings = await db.select().from(referralEarnings)
    .where(eq(referralEarnings.referrerId, user.id))

  const settingsRows = await db.select().from(referralSettings)
    .where(eq(referralSettings.id, "global"))
  const rewardPercent = Number(settingsRows[0]?.rewardPercent ?? 10)

  // Fetch all referred users and courses in one pass
  const [allUsers, allCourses] = await Promise.all([
    db.select().from(users),
    db.select().from(courses),
  ]) as [User[], Course[]]

  const enriched = (earnings as Earning[]).map((e) => ({
    ...e,
    referredName: allUsers.find((u) => u.id === e.referredId)?.name ?? "Unknown",
    courseTitle:  allCourses.find((c) => c.id === e.courseId)?.title ?? "Deleted course",
  }))

  const totalEarned = (earnings as Earning[])
    .filter((e) => e.status === "credited")
    .reduce((s, e) => s + Number(e.amount), 0)

  const pendingAmount = (earnings as Earning[])
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + Number(e.amount), 0)

  return NextResponse.json({
    code,
    rewardPercent,
    totalReferrals: earnings.length,
    totalEarned,
    pendingAmount,
    earnings: enriched,
  })
}
