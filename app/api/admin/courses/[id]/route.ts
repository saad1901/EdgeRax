import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"
import { deleteWasabiVideo, getVideoKeyFromMarker, isPrivateVideoMarker } from "@/lib/wasabi-video"
import { canManageCourse, getCourseManager, requireManageCourse } from "@/lib/course-access"

type Chapter = InferSelectModel<typeof chapters>

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const manager = await getCourseManager()
  if (!manager) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const { id } = await params
  const rows = await db.select().from(courses).where(eq(courses.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })
  if (!canManageCourse(manager, rows[0])) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const chs = await db.select().from(chapters).where(eq(chapters.courseId, id)).orderBy(asc(chapters.position))
  return NextResponse.json({
    ...rows[0],
    chapters: await Promise.all(chs.map(async (ch: Chapter) => ({
      ...ch,
      lessons: await db.select().from(lessons).where(eq(lessons.chapterId, ch.id)).orderBy(asc(lessons.position)),
    }))),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireManageCourse(id)
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const body = await req.json()
  const allowed = ["title","instructor","instructorId","category","description","shortDescription","duration","price","originalPrice","thumbnail","level","referralAmount","validityDays","certificatesEnabled","status","startDate"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) if (key in body) update[key] = body[key]
  if (access.user.role === "instructor") {
    // Instructors cannot change the instructor name or assignment
    update.instructor  = access.user.name
    update.instructorId = access.user.id
  } else if ("instructorId" in body) {
    // Admin is changing the instructor — resolve the name from the DB
    const { users } = await import("@/lib/db/schema")
    const { eq: drizzleEq } = await import("drizzle-orm")
    if (body.instructorId) {
      const instRows = await db.select().from(users).where(drizzleEq(users.id, body.instructorId))
      if (instRows[0]) {
        update.instructorId = instRows[0].id
        update.instructor   = instRows[0].name
      }
    } else {
      update.instructorId = null
    }
  }
  // Allow clearing the per-course override by passing null
  if ("referralAmount" in body) {
    update.referralAmount = body.referralAmount === null || body.referralAmount === "" ? null : Number(body.referralAmount)
  }
  // Allow setting validity: null = lifetime, number = days
  if ("validityDays" in body) {
    update.validityDays = body.validityDays === null || body.validityDays === "" ? null : Number(body.validityDays)
  }
  // Allow clearing the original price by passing null
  if ("originalPrice" in body) {
    update.originalPrice = body.originalPrice === null || body.originalPrice === "" ? null : Number(body.originalPrice)
  }
  // Coerce certificatesEnabled to a proper boolean
  if ("certificatesEnabled" in body) {
    update.certificatesEnabled = Boolean(body.certificatesEnabled)
  }
  // Allow clearing startDate by passing null
  if ("startDate" in body) {
    update.startDate = body.startDate || null
  }
  await db.update(courses).set(update).where(eq(courses.id, id))
  const updated = await db.select().from(courses).where(eq(courses.id, id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireManageCourse(id)
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  // Clean up Wasabi video objects
  const chs = await db.select().from(chapters).where(eq(chapters.courseId, id))
  for (const ch of chs) {
    const lsns = await db.select().from(lessons).where(eq(lessons.chapterId, ch.id))
    for (const l of lsns) {
      if (isPrivateVideoMarker(l.videoUrl)) {
        try {
          await deleteWasabiVideo(getVideoKeyFromMarker(l.videoUrl, l.id))
        } catch (error) {
          console.warn("[DELETE /api/admin/courses/[id]] Wasabi video cleanup failed", error)
        }
      }
    }
  }
  await db.delete(courses).where(eq(courses.id, id))
  return NextResponse.json({ ok: true })
}
