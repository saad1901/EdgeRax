import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internshipTasks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/**
 * PATCH /api/admin/internship-tasks/[id]
 * Admin updates a task — can change status, feedback, or any field.
 * Body: { status?, adminFeedback?, title?, description?, deadline? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const rows = await db.select().from(internshipTasks).where(eq(internshipTasks.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Task not found." }, { status: 404 })

  const body = await req.json()
  const allowed = ["title", "description", "deadline", "status", "adminFeedback"]
  const update: Record<string, any> = { updatedAt: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await db.update(internshipTasks).set(update).where(eq(internshipTasks.id, id))
  const updated = await db.select().from(internshipTasks).where(eq(internshipTasks.id, id))
  return NextResponse.json(updated[0])
}

/**
 * DELETE /api/admin/internship-tasks/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  await db.delete(internshipTasks).where(eq(internshipTasks.id, id))
  return NextResponse.json({ ok: true })
}
