import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internshipTasks, internshipApplications } from "@/lib/db/schema"
import { getCurrentUser, uid } from "@/lib/auth"
import { eq } from "drizzle-orm"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return null
  return user
}

/**
 * POST /api/admin/internship-tasks
 * Creates a new task for an accepted intern.
 * Body: { applicationId, title, description?, deadline? }
 */
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { applicationId, title, description = "", deadline = null } = await req.json()
    if (!applicationId) return NextResponse.json({ error: "applicationId is required." }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 })

    // Fetch application to get internshipId and userId
    const appRows = await db.select().from(internshipApplications).where(eq(internshipApplications.id, applicationId))
    const app = appRows[0]
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    if (app.status !== "accepted") return NextResponse.json({ error: "Tasks can only be assigned to accepted interns." }, { status: 400 })

    const now = new Date().toISOString()
    const task = {
      id:            uid("task"),
      applicationId,
      internshipId:  app.internshipId,
      userId:        app.userId,
      title:         title.trim(),
      description:   description.trim(),
      deadline:      deadline || null,
      status:        "pending" as const,
      submissionNote: "",
      submissionUrl:  "",
      adminFeedback:  "",
      updatedAt:     now,
    }
    await db.insert(internshipTasks).values(task)
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/internship-tasks]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
