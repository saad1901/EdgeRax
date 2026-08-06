import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, userSessions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * PATCH /api/admin/students/[id]
 * Body: { name?, email?, phone? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const rows = await db.select().from(users).where(eq(users.id, id))
  const target = rows[0]
  if (!target || target.role !== "user")
    return NextResponse.json({ error: "Student not found." }, { status: 404 })

  const updates: Record<string, any> = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 })
    updates.name = name
  }

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 })
    // Check uniqueness (exclude self)
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing.length > 0 && existing[0].id !== id)
      return NextResponse.json({ error: "Email already in use." }, { status: 409 })
    updates.email = email
  }

  if (body.phone !== undefined) {
    updates.phone = String(body.phone).trim() || null
  }

  if (body.referralPercent !== undefined) {
    if (body.referralPercent === null || body.referralPercent === "") {
      // null means "use global"
      updates.referralPercent = null
    } else {
      const pct = Number(body.referralPercent)
      if (isNaN(pct) || pct < 0 || pct > 100)
        return NextResponse.json({ error: "Referral % must be between 0 and 100." }, { status: 400 })
      updates.referralPercent = Math.round(pct * 100) / 100
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id))
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/students/[id]
 * Deletes the student account and all their sessions/purchases (cascade).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params

  const rows = await db.select().from(users).where(eq(users.id, id))
  const target = rows[0]
  if (!target || target.role !== "user")
    return NextResponse.json({ error: "Student not found." }, { status: 404 })

  // Sessions are deleted by cascade; purchases are deleted by cascade too
  await db.delete(users).where(eq(users.id, id))

  return NextResponse.json({ ok: true })
}
