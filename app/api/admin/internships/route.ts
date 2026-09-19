import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships, internshipApplications, users } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/**
 * GET /api/admin/internships
 * Returns all internships with application counts.
 */
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const allInternships = await db.select().from(internships).orderBy(asc(internships.createdAt))
  const allApplications = await db.select().from(internshipApplications)

  return NextResponse.json(allInternships.map((i: any) => ({
    ...i,
    applicationCount: allApplications.filter((a: any) => a.internshipId === i.id).length,
  })))
}

/**
 * POST /api/admin/internships
 * Creates a new internship listing.
 */
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const body = await req.json()
    const {
      title, domain = "", description = "", shortDescription = "",
      duration = "", stipend = "Unpaid", applicationFee = 0, joiningFee = 0,
      seats = 0, requirements = "", perks = "[]", status = "open",
      lastDateToApply = null, startDate = null, thumbnail = "",
    } = body

    if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 })

    const now = new Date().toISOString()
    const internship = {
      id: uid("intern"),
      title: title.trim(),
      domain: domain.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      duration: duration.trim(),
      stipend: stipend.trim(),
      applicationFee: Number(applicationFee) || 0,
      joiningFee: Number(joiningFee) || 0,
      seats: Number(seats) || 0,
      requirements: requirements.trim(),
      perks: typeof perks === "string" ? perks : JSON.stringify(perks),
      status,
      lastDateToApply: lastDateToApply || null,
      startDate: startDate || null,
      thumbnail: thumbnail.trim(),
      updatedAt: now,
    }
    await db.insert(internships).values(internship)
    return NextResponse.json(internship, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/internships]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
