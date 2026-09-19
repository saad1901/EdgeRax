import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { payouts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/** DELETE /api/admin/payouts/[id] — remove a mistakenly logged payout */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const rows = await db.select().from(payouts).where(eq(payouts.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Payout not found." }, { status: 404 })

  await db.delete(payouts).where(eq(payouts.id, id))
  return NextResponse.json({ ok: true })
}
