import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withdrawalRequests, referralEarnings, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

/**
 * GET /api/withdrawals
 * Returns the current user's withdrawal request history.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const rows = await db.select().from(withdrawalRequests)
    .where(eq(withdrawalRequests.userId, user.id))

  return NextResponse.json(rows)
}

/**
 * POST /api/withdrawals
 * Body: { amount: number; upiId: string }
 * Creates a new withdrawal request for the current user's credited balance.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { amount, upiId } = await req.json()

    if (!upiId?.trim())
      return NextResponse.json({ error: "UPI ID is required." }, { status: 400 })
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1)
      return NextResponse.json({ error: "Enter a valid withdrawal amount." }, { status: 400 })

    // Validate UPI ID format (basic: contains @)
    if (!upiId.trim().includes("@"))
      return NextResponse.json({ error: "Enter a valid UPI ID (e.g. name@upi)." }, { status: 400 })

    const requestedAmount = Number(amount)

    // Calculate credited balance
    const earnings = await db.select().from(referralEarnings)
      .where(eq(referralEarnings.referrerId, user.id))
    const credited = earnings
      .filter((e: any) => e.status === "credited")
      .reduce((s: number, e: any) => s + Number(e.amount), 0)

    // Calculate already-requested amount (pending + paid)
    const existing = await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, user.id))
    const alreadyRequested = existing
      .filter((w: any) => w.status === "pending" || w.status === "paid")
      .reduce((s: number, w: any) => s + Number(w.amount), 0)

    const available = credited - alreadyRequested
    if (requestedAmount > available)
      return NextResponse.json({
        error: `Insufficient balance. Available: ₹${available.toFixed(0)}`,
      }, { status: 400 })

    const now = new Date().toISOString()
    const withdrawal = {
      id: uid("wd"),
      userId: user.id,
      amount: requestedAmount,
      upiId: upiId.trim(),
      status: "pending" as const,
      note: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(withdrawalRequests).values(withdrawal)

    return NextResponse.json(withdrawal, { status: 201 })
  } catch (err) {
    console.error("[POST /api/withdrawals]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
