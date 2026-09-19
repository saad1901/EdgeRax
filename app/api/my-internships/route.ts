import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internshipApplications, internships, internshipTasks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * GET /api/my-internships
 * Auth required.
 * Returns the current user's applications enriched with internship details and tasks.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const applications = await db.select().from(internshipApplications)
    .where(eq(internshipApplications.userId, user.id))

  const allInternships = await db.select().from(internships)
  const allTasks = await db.select().from(internshipTasks)
    .where(eq(internshipTasks.userId, user.id))

  const enriched = applications.map((app: any) => ({
    ...app,
    internship: allInternships.find((i: any) => i.id === app.internshipId) ?? null,
    tasks: allTasks.filter((t: any) => t.applicationId === app.id),
  }))

  return NextResponse.json(enriched)
}
