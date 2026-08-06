import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, referralEarnings, revenueShares, purchaseAllocations, users } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Allocation      = InferSelectModel<typeof purchaseAllocations>
type ReferralEarning = InferSelectModel<typeof referralEarnings>
type RevenueShare    = InferSelectModel<typeof revenueShares>

function r2(n: number) { return Math.round(n * 100) / 100 }

/**
 * GET /api/admin/revenue-breakdown
 *
 * All figures are derived from the immutable purchase_allocations table
 * (instructor + share cuts) and from referral_earnings (student referral payouts).
 *
 * Instructor payouts and referral payouts are kept completely separate:
 *   - Instructor → purchase_allocations WHERE type = "instructor"
 *   - Referral   → referral_earnings WHERE the referrer is NOT an instructor
 *                  (guards against any legacy rows written by old giveaway code)
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [
    allPurchases,
    allAllocations,
    allReferralEarnings,
    allShares,
    allUsers,
  ] = await Promise.all([
    db.select().from(purchases),
    db.select().from(purchaseAllocations),
    db.select().from(referralEarnings),
    db.select().from(revenueShares),
    db.select().from(users),
  ]) as [
    InferSelectModel<typeof purchases>[],
    Allocation[],
    ReferralEarning[],
    RevenueShare[],
    InferSelectModel<typeof users>[],
  ]

  // Build a set of instructor user IDs so we can exclude them from referral sums
  const instructorIds = new Set(
    allUsers.filter((u) => u.role === "instructor").map((u) => u.id)
  )

  // ── Total revenue ────────────────────────────────────────────────────────────
  const totalRevenue = r2(allPurchases.reduce((s, p) => s + Number(p.amount), 0))

  // ── Instructor cut — from locked purchase_allocations ────────────────────────
  const instructorCut = r2(
    allAllocations
      .filter((a) => a.type === "instructor")
      .reduce((s, a) => s + Number(a.amount), 0)
  )

  // ── Referral payouts — only rows where referrer is a regular user (not instructor)
  // This filters out any legacy rows that were mistakenly written by the old giveaway
  // code which re-used referral_earnings for instructor commission.
  const pureReferralEarnings = allReferralEarnings.filter(
    (e) => !instructorIds.has(e.referrerId)
  )

  let referralPaid    = 0
  let referralPending = 0
  for (const e of pureReferralEarnings) {
    if (e.status === "credited")     referralPaid    += Number(e.amount)
    else if (e.status === "pending") referralPending += Number(e.amount)
  }
  referralPaid    = r2(referralPaid)
  referralPending = r2(referralPending)

  // ── Revenue shares — from locked purchase_allocations ────────────────────────
  const sharesBreakdown = allShares.map((s) => {
    const locked = r2(
      allAllocations
        .filter((a) => a.type === "share" && a.referenceId === s.id)
        .reduce((sum, a) => sum + Number(a.amount), 0)
    )
    const hasHistory = allAllocations.some((a) => a.type === "share" && a.referenceId === s.id)
    return {
      id:          s.id,
      name:        s.name,
      designation: s.designation,
      percentage:  Number(s.percentage),
      amount:      locked,
      hasHistory,
    }
  })

  return NextResponse.json({
    totalRevenue,
    instructorCut,
    referral: {
      paid:    referralPaid,
      pending: referralPending,
      total:   r2(referralPaid + referralPending),
    },
    shares: sharesBreakdown,
  })
}
