import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, hashPassword } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * PATCH /api/admin/instructors/[id]
 * Body: { name?, email?, phone?, commissionPercent?, upiId?, degree?, organization?, bio?, password? }
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
  if (!target || target.role !== "instructor")
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 })

  const updates: Record<string, any> = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 })
    updates.name = name
  }

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 })
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing.length > 0 && existing[0].id !== id)
      return NextResponse.json({ error: "Email already in use." }, { status: 409 })
    updates.email = email
  }

  if (body.phone !== undefined)
    updates.phone = String(body.phone).trim() || null

  if (body.commissionPercent !== undefined) {
    const c = Number(body.commissionPercent)
    if (isNaN(c) || c < 0 || c > 100)
      return NextResponse.json({ error: "Commission must be 0–100." }, { status: 400 })
    updates.commissionPercent = c
  }

  if (body.upiId     !== undefined) updates.upiId        = String(body.upiId     ?? "").trim()
  if (body.degree    !== undefined) updates.degree       = String(body.degree    ?? "").trim()
  if (body.organization !== undefined) updates.organization = String(body.organization ?? "").trim()
  if (body.bio       !== undefined) updates.bio          = String(body.bio       ?? "").trim()

  if (body.password !== undefined) {
    const pwd = String(body.password)
    if (pwd.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    updates.password = await hashPassword(pwd)
  }

  // If the instructor's name changed, update the denormalised name on their courses too
  if (updates.name) {
    await db.update(courses)
      .set({ instructor: updates.name })
      .where(eq(courses.instructorId, id))
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id))
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/instructors/[id]
 *
 * If the instructor has courses assigned:
 *   - Body must include { replacementInstructorId: string }
 *   - Courses are reassigned to the replacement before deleting
 *
 * If no courses: deletes immediately.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params

  const rows = await db.select().from(users).where(eq(users.id, id))
  const target = rows[0]
  if (!target || target.role !== "instructor")
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 })

  // Find courses assigned to this instructor
  const assignedCourses = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.instructorId, id))

  if (assignedCourses.length > 0) {
    // Peek at the body to see if a replacement was provided
    let body: any = {}
    try { body = await req.json() } catch {}

    const { replacementInstructorId } = body

    if (!replacementInstructorId) {
      // Tell the client which courses are blocking the delete
      return NextResponse.json(
        {
          error: "Instructor has courses assigned.",
          requiresReplacement: true,
          courses: assignedCourses,
        },
        { status: 409 },
      )
    }

    // Validate replacement
    const replRows = await db.select().from(users).where(eq(users.id, replacementInstructorId))
    const replacement = replRows[0]
    if (!replacement || replacement.role !== "instructor")
      return NextResponse.json({ error: "Replacement instructor not found." }, { status: 400 })

    // Reassign all courses to the replacement
    await db.update(courses)
      .set({ instructorId: replacement.id, instructor: replacement.name })
      .where(eq(courses.instructorId, id))
  }

  // Safe to delete now — sessions/purchases cascade
  await db.delete(users).where(eq(users.id, id))

  return NextResponse.json({ ok: true })
}
