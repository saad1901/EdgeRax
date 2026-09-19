import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internshipTasks } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * PATCH /api/my-internships/tasks/[id]/submit
 * Auth required. Student submits a task.
 * Body: { submissionNote?: string; submissionUrl?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { id } = await params

  const taskRows = await db.select().from(internshipTasks)
    .where(and(eq(internshipTasks.id, id), eq(internshipTasks.userId, user.id)))
  const task = taskRows[0]
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 })
  if (task.status === "approved") return NextResponse.json({ error: "Task already approved." }, { status: 400 })

  const { submissionNote = "", submissionUrl = "" } = await req.json()

  await db.update(internshipTasks)
    .set({ status: "submitted", submissionNote, submissionUrl, updatedAt: new Date().toISOString() })
    .where(eq(internshipTasks.id, id))

  return NextResponse.json({ ok: true })
}
