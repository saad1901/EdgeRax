import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships, internshipApplications, internshipTasks, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/**
 * GET /api/admin/internships/[id]
 * Returns one internship with all applications and applicant details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const rows = await db.select().from(internships).where(eq(internships.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const applications = await db.select().from(internshipApplications)
    .where(eq(internshipApplications.internshipId, id))
  const allUsers = await db.select().from(users)
  const allTasks = await db.select().from(internshipTasks)
    .where(eq(internshipTasks.internshipId, id))

  const enrichedApplications = applications.map((app: any) => ({
    ...app,
    applicant: allUsers.find((u: any) => u.id === app.userId) ?? null,
    tasks: allTasks.filter((t: any) => t.applicationId === app.id),
  }))

  return NextResponse.json({ ...rows[0], applications: enrichedApplications })
}

/**
 * PATCH /api/admin/internships/[id]
 * Updates an internship listing.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  const rows = await db.select().from(internships).where(eq(internships.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })

  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const allowed = [
      "title", "domain", "description", "shortDescription", "duration",
      "stipend", "applicationFee", "joiningFee", "seats", "requirements", "perks",
      "status", "lastDateToApply", "startDate", "thumbnail",
    ]
    const update: Record<string, any> = { updatedAt: now }
    for (const key of allowed) {
      if (key in body) {
        if (key === "perks" && typeof body[key] !== "string") {
          update[key] = JSON.stringify(body[key])
        } else {
          update[key] = body[key]
        }
      }
    }
    await db.update(internships).set(update).where(eq(internships.id, id))
    const updated = await db.select().from(internships).where(eq(internships.id, id))
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[PATCH /api/admin/internships/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/internships/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const { id } = await params
  await db.delete(internships).where(eq(internships.id, id))
  return NextResponse.json({ ok: true })
}
