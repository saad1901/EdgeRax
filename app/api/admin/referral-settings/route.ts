import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { referralSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * GET /api/admin/referral-settings
 */
export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const rows = await db.select().from(referralSettings).where(eq(referralSettings.id, "global"))
  return NextResponse.json(rows[0] ?? {
    id: "global", rewardPercent: 10, maxReferrals: 0, autoCredit: false,
  })
}

/**
 * PATCH /api/admin/referral-settings
 * Body: { rewardPercent?: number; maxReferrals?: number; autoCredit?: boolean }
 *
 * rewardPercent must be between 0 and 100 (up to 2 decimal places).
 */
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { rewardPercent, maxReferrals, autoCredit } = await req.json()

    // Validate percentage
    if (rewardPercent !== undefined) {
      const pct = Number(rewardPercent)
      if (isNaN(pct) || pct < 0 || pct > 100)
        return NextResponse.json(
          { error: "Referral percentage must be between 0 and 100." },
          { status: 400 },
        )
      // Round to 2 decimal places
      const rounded = Math.round(pct * 100) / 100
      if (rounded !== pct && Math.abs(rounded - pct) > 0.001)
        return NextResponse.json(
          { error: "Referral percentage allows at most 2 decimal places." },
          { status: 400 },
        )
    }

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (rewardPercent !== undefined) patch.rewardPercent = Math.round(Number(rewardPercent) * 100) / 100
    if (maxReferrals  !== undefined) patch.maxReferrals  = Number(maxReferrals)
    if (autoCredit    !== undefined) patch.autoCredit    = Boolean(autoCredit)

    const existing = await db.select().from(referralSettings)
      .where(eq(referralSettings.id, "global"))

    if (existing.length === 0) {
      await db.insert(referralSettings).values({
        id:           "global",
        rewardPercent: rewardPercent !== undefined ? Math.round(Number(rewardPercent) * 100) / 100 : 10,
        maxReferrals:  maxReferrals  !== undefined ? Number(maxReferrals)  : 0,
        autoCredit:    autoCredit    !== undefined ? Boolean(autoCredit)   : false,
      })
    } else {
      await db.update(referralSettings).set(patch).where(eq(referralSettings.id, "global"))
    }

    const updated = await db.select().from(referralSettings).where(eq(referralSettings.id, "global"))
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[PATCH /api/admin/referral-settings]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
