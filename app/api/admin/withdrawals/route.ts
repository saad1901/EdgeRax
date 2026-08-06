import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withdrawalRequests, users, referralPaymentReceipts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { generateReceiptPdf, makeReceiptNo } from "@/lib/receipt"
import crypto from "crypto"
import type { InferSelectModel } from "drizzle-orm"

type WithdrawalRequest = InferSelectModel<typeof withdrawalRequests>
type User = InferSelectModel<typeof users>

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * GET /api/admin/withdrawals
 * Returns all withdrawal requests enriched with user info.
 */
export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allWithdrawals, allUsers] = await Promise.all([
    db.select().from(withdrawalRequests),
    db.select().from(users),
  ]) as [WithdrawalRequest[], User[]]

  const allReceipts = await db.select().from(referralPaymentReceipts)

  const enriched = allWithdrawals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((w) => {
      const u = allUsers.find((u) => u.id === w.userId)
      // find receipt if exists
      const receipt = (allReceipts || []).find((r: any) => r.withdrawalId === w.id)
      return {
        ...w,
        userName:  u?.name  ?? "Unknown",
        userEmail: u?.email ?? "",
        userPhone: u?.phone ?? "",
        receiptId: receipt?.id ?? null,
      }
    })

  return NextResponse.json(enriched)
}

/**
 * PATCH /api/admin/withdrawals
 * Body: { id: string; status: "paid" | "rejected" | "pending"; note?: string }
 */
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { id, status, note } = await req.json()
    if (!id || !["paid", "rejected", "pending"].includes(status))
      return NextResponse.json({ error: "Valid id and status required." }, { status: 400 })

    await db.update(withdrawalRequests)
      .set({ status, note: note ?? null, updatedAt: new Date().toISOString() })
      .where(eq(withdrawalRequests.id, id))

    // If marked paid, generate PDF receipt and store metadata
    if (status === "paid") {
      try {
        const [wd] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id))
        const [u] = await db.select().from(users).where(eq(users.id, wd.userId))
        const admin = await getCurrentUser()
        const receiptId = crypto.randomUUID()
        const receiptNo = makeReceiptNo()
        const transactionId = note ?? `TX-${receiptId.slice(0,8)}`
        const filePath = await generateReceiptPdf({
          receiptId,
          receiptNo,
          withdrawalId: wd.id,
          transactionId,
          amount: wd.amount,
          userName: u?.name ?? "Unknown",
          userEmail: u?.email ?? "",
          userPhone: u?.phone ?? null,
          upiId: wd.upiId,
          paymentMethod: "UPI",
          adminName: admin?.name ?? "Admin",
        })

        await db.insert(referralPaymentReceipts).values({
          id: receiptId,
          withdrawalId: wd.id,
          userId: wd.userId,
          adminId: admin?.id ?? "",
          filePath,
          receiptNo,
          transactionId,
          amount: wd.amount,
          createdAt: new Date().toISOString(),
        })
      } catch (e) {
        console.error("[generate receipt]", e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/admin/withdrawals]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
