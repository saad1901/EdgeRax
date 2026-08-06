import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revenueShares } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/** PATCH /api/admin/shares/[id] — update name, designation, or percentage */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(revenueShares).where(eq(revenueShares.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Share not found." }, { status: 404 })

  try {
    const body = await req.json()
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 })
      updates.name = name
    }
    if (body.designation !== undefined)
      updates.designation = String(body.designation ?? "").trim()
    if (body.percentage !== undefined) {
      const pct = Number(body.percentage)
      if (isNaN(pct) || pct < 0 || pct > 100)
        return NextResponse.json({ error: "Percentage must be between 0 and 100." }, { status: 400 })
      updates.percentage = Math.round(pct * 100) / 100
    }

    await db.update(revenueShares).set(updates).where(eq(revenueShares.id, id))
    const updated = await db.select().from(revenueShares).where(eq(revenueShares.id, id))
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[PATCH /api/admin/shares/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/** DELETE /api/admin/shares/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(revenueShares).where(eq(revenueShares.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Share not found." }, { status: 404 })
  await db.delete(revenueShares).where(eq(revenueShares.id, id))
  return NextResponse.json({ ok: true })
}
