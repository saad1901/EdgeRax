import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { coupons } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ["code", "courseId", "discountType", "discountValue", "maxUsage", "expiresAt", "active"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  if ("code" in update) update.code = String(update.code).trim().toUpperCase()
  if ("courseId" in update) update.courseId = update.courseId || null
  if ("expiresAt" in update) update.expiresAt = update.expiresAt || null

  await db.update(coupons).set(update).where(eq(coupons.id, id))
  const rows = await db.select().from(coupons).where(eq(coupons.id, id))
  return NextResponse.json(rows[0] ?? { error: "Not found." })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  await db.delete(coupons).where(eq(coupons.id, id))
  return NextResponse.json({ ok: true })
}
