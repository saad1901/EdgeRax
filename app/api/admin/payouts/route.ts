import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { payouts, users, revenueShares, purchaseAllocations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Payout     = InferSelectModel<typeof payouts>
type Allocation = InferSelectModel<typeof purchaseAllocations>

function r2(n: number) { return Math.round(n * 100) / 100 }

/**
 * GET /api/admin/payouts
 * Returns all payout records plus an "outstanding balance" summary per recipient
 * (total earned from purchase_allocations minus total paid out).
 */
export async function GET() {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [
    allPayouts,
    allAllocations,
    allUsers,
    allShares,
  ] = await Promise.all([
    db.select().from(payouts),
    db.select().from(purchaseAllocations),
    db.select().from(users),
    db.select().from(revenueShares),
  ]) as [Payout[], Allocation[], InferSelectModel<typeof users>[], InferSelectModel<typeof revenueShares>[]]

  const instructors = allUsers.filter((u) => u.role === "instructor")
  const admins      = allUsers.filter((u) => u.role === "admin")

  // ── Outstanding balances ──────────────────────────────────────────────────
  // For each instructor: total earned = sum of allocations type="instructor"
  const instructorRecipients = instructors.map((inst) => {
    const earned = r2(
      allAllocations
        .filter((a) => a.type === "instructor" && a.referenceId === inst.id)
        .reduce((s, a) => s + Number(a.amount), 0)
    )
    const paid = r2(
      allPayouts
        .filter((p) => p.recipientType === "instructor" && p.recipientId === inst.id)
        .reduce((s, p) => s + Number(p.amount), 0)
    )
    return {
      type:        "instructor" as const,
      id:          inst.id,
      name:        inst.name,
      designation: inst.role,
      earned,
      paid,
      outstanding: r2(earned - paid),
    }
  })

  // For each share holder: total earned = sum of allocations type="share"
  const shareRecipients = allShares.map((share) => {
    const earned = r2(
      allAllocations
        .filter((a) => a.type === "share" && a.referenceId === share.id)
        .reduce((s, a) => s + Number(a.amount), 0)
    )
    const paid = r2(
      allPayouts
        .filter((p) => p.recipientType === "share" && p.recipientId === share.id)
        .reduce((s, p) => s + Number(p.amount), 0)
    )
    return {
      type:        "share" as const,
      id:          share.id,
      name:        share.name,
      designation: share.designation,
      earned,
      paid,
      outstanding: r2(earned - paid),
    }
  })

  // For each admin: no "earned" tracking — admins are paid manually as needed
  const adminRecipients = admins.map((adm) => {
    const paid = r2(
      allPayouts
        .filter((p) => p.recipientType === "admin" && p.recipientId === adm.id)
        .reduce((s, p) => s + Number(p.amount), 0)
    )
    return {
      type:        "admin" as const,
      id:          adm.id,
      name:        adm.name,
      designation: "Admin",
      earned:      0,   // admins don't have allocation-based earnings
      paid,
      outstanding: 0,
    }
  }).filter((r) => r.paid > 0) // only show if at least one payout exists

  const recipients = [...instructorRecipients, ...shareRecipients, ...adminRecipients]
    .filter((r) => r.earned > 0 || r.paid > 0)

  // ── Payout history (newest first) ────────────────────────────────────────
  const adminMap = new Map(allUsers.map((u) => [u.id, u.name]))

  // Always return all admin users so the log-payout form can select them
  // even before any payout to them has been recorded.
  const allAdminOptions = admins.map((adm) => ({
    type: "admin" as const,
    id:   adm.id,
    name: adm.name,
  }))
  const history = [...allPayouts]
    .sort((a, b) => new Date(String(b.paidAt)).getTime() - new Date(String(a.paidAt)).getTime())
    .map((p) => ({
      id:            p.id,
      recipientType: p.recipientType,
      recipientId:   p.recipientId,
      recipientName: p.recipientName,
      amount:        Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentRef:    p.paymentRef,
      note:          p.note,
      paidBy:        adminMap.get(p.paidBy) ?? "Admin",
      paidAt:        p.paidAt,
    }))

  return NextResponse.json({ recipients, history, adminOptions: allAdminOptions })
}

/**
 * POST /api/admin/payouts
 * Body: { recipientType, recipientId, amount, paymentMethod, paymentRef?, note? }
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { recipientType, recipientId, amount, paymentMethod, paymentRef, note } = await req.json()

    if (!["instructor", "share", "admin"].includes(recipientType))
      return NextResponse.json({ error: "Invalid recipientType." }, { status: 400 })
    if (!recipientId)
      return NextResponse.json({ error: "recipientId is required." }, { status: 400 })
    const amt = Number(amount)
    if (isNaN(amt) || amt <= 0)
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 })
    if (!paymentMethod)
      return NextResponse.json({ error: "paymentMethod is required." }, { status: 400 })

    // Resolve recipient name
    let recipientName = ""
    if (recipientType === "instructor" || recipientType === "admin") {
      const rows = await db.select().from(users).where(eq(users.id, recipientId))
      recipientName = rows[0]?.name ?? recipientId
    } else {
      const rows = await db.select().from(revenueShares).where(eq(revenueShares.id, recipientId))
      recipientName = rows[0]?.name ?? recipientId
    }

    const payout = {
      id:            uid("pay"),
      recipientType,
      recipientId,
      recipientName,
      amount:        r2(amt),
      paymentMethod,
      paymentRef:    String(paymentRef ?? "").trim(),
      note:          String(note ?? "").trim(),
      paidBy:        admin.id,
    }

    await db.insert(payouts).values(payout)
    return NextResponse.json(payout, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/payouts]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
