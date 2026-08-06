/**
 * recordAllocations — called once per purchase to snapshot instructor commission,
 * revenue-share cuts, and referral earnings into purchase_allocations.
 *
 * Amounts are computed from paidAmount (after any coupon discount) and frozen
 * at the rates active at purchase time. Future % changes don't touch these rows.
 */
import { db } from "./db"
import { users, revenueShares, referralEarnings, purchaseAllocations } from "./db/schema"
import { and, eq } from "drizzle-orm"
import { uid } from "./auth"

function r2(n: number) { return Math.round(n * 100) / 100 }

interface AllocateArgs {
  purchaseId:  string
  courseId:    string
  paidAmount:  number   // actual amount paid (post-coupon)
  instructorId?: string | null
  /** userId of the referrer, if a referral earning was recorded */
  referrerId?:  string | null
}

export async function recordAllocations({
  purchaseId,
  courseId,
  paidAmount,
  instructorId,
  referrerId,
}: AllocateArgs): Promise<void> {
  if (paidAmount <= 0) return  // free/giveaway — nothing to allocate

  const rows: {
    id: string
    purchaseId: string
    type: string
    referenceId: string
    referenceName: string
    percentage: number
    amount: number
  }[] = []

  // ── Instructor ────────────────────────────────────────────────────────────
  if (instructorId) {
    const instRows = await db.select().from(users).where(eq(users.id, instructorId))
    const inst = instRows[0]
    if (inst) {
      const pct = Number(inst.commissionPercent ?? 0)
      const amt = r2(paidAmount * pct / 100)
      if (amt > 0) {
        rows.push({
          id:            uid("alloc"),
          purchaseId,
          type:          "instructor",
          referenceId:   inst.id,
          referenceName: inst.name,
          percentage:    pct,
          amount:        amt,
        })
      }
    }
  }

  // ── Revenue shares ────────────────────────────────────────────────────────
  const shares = await db.select().from(revenueShares)
  for (const share of shares) {
    const pct = Number(share.percentage ?? 0)
    const amt = r2(paidAmount * pct / 100)
    if (amt > 0) {
      rows.push({
        id:            uid("alloc"),
        purchaseId,
        type:          "share",
        referenceId:   share.id,
        referenceName: share.name,
        percentage:    pct,
        amount:        amt,
      })
    }
  }

  // ── Referral ──────────────────────────────────────────────────────────────
  // Look up the referral earning that was just created for this purchase
  if (referrerId) {
    const earnRows = await db.select().from(referralEarnings)
      .where(and(
        eq(referralEarnings.referrerId, referrerId),
        eq(referralEarnings.courseId, courseId),
      ))
    const earn = earnRows[earnRows.length - 1]  // most recent
    if (earn) {
      const pct = paidAmount > 0 ? r2(Number(earn.amount) / paidAmount * 100) : 0
      rows.push({
        id:            uid("alloc"),
        purchaseId,
        type:          "referral",
        referenceId:   referrerId,
        referenceName: (await db.select().from(users).where(eq(users.id, referrerId)))[0]?.name ?? referrerId,
        percentage:    pct,
        amount:        r2(Number(earn.amount)),
      })
    }
  }

  if (rows.length > 0) {
    await db.insert(purchaseAllocations).values(rows)
  }
}
