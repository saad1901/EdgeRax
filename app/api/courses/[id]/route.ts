import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, chapters, lessons, purchases, users } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"
import { isPrivateVideoMarker } from "@/lib/wasabi-video"

type Chapter = InferSelectModel<typeof chapters>
type Lesson  = InferSelectModel<typeof lessons>

/** Mirror of the same function in /api/courses/route.ts */
function displayStudentCount(course: InferSelectModel<typeof courses>): number {
  const actual    = course.students ?? 0
  const marketing = (course as any).marketingStudentCount ?? 0
  const mode      = (course as any).studentCountMode ?? "actual"
  if (mode === "custom") return marketing
  if (mode === "total")  return actual + marketing
  return actual
}

/** Resolve the best playable URL for a lesson video. */
function resolvePlayableUrl(l: Lesson, owned: boolean): string {
  const raw = String(l.videoUrl ?? "")

  // Non-owners can't see private videos at all
  if (!owned && !l.preview) {
    return isPrivateVideoMarker(raw) ? "" : raw
  }

  // Private uploads must stay behind the app route. A direct CDN/object URL can
  // be recovered from browser devtools and downloaded outside our access checks.
  if (isPrivateVideoMarker(raw)) {
    return `__proxy__${l.id}`
  }

  return raw
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await db.select().from(courses).where(eq(courses.id, id))
    const course = rows[0]
    if (!course) return NextResponse.json({ error: "Not found." }, { status: 404 })

    const [chs, user] = await Promise.all([
      db.select().from(chapters).where(eq(chapters.courseId, id)).orderBy(asc(chapters.position)),
      getCurrentUser(),
    ])

    let owned = false
    if (user) {
      const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, user.id))
      const purchase = userPurchases.find((p: { courseId: string; expiresAt?: string | null }) => p.courseId === id)
      if (purchase) {
        const notExpired = !purchase.expiresAt || new Date(purchase.expiresAt) > new Date()
        owned = notExpired
      }
    }

    // Fetch instructor profile if linked
    let instructorProfile: { degree: string; organization: string; bio: string } | null = null
    if (course.instructorId) {
      const instRows = await db.select().from(users).where(eq(users.id, course.instructorId))
      const inst = instRows[0]
      if (inst) {
        instructorProfile = {
          degree:       (inst as any).degree ?? "",
          organization: (inst as any).organization ?? "",
          bio:          (inst as any).bio ?? "",
        }
      }
    }

    const result = {
      ...course,
      students: displayStudentCount(course),
      instructorProfile,
      chapters: await Promise.all((chs as Chapter[]).map(async (ch) => ({
        ...ch,
        lessons: (await db.select().from(lessons).where(eq(lessons.chapterId, ch.id)).orderBy(asc(lessons.position)))
          .map((l: Lesson) => ({
            ...l,
            videoUrl: resolvePlayableUrl(l, owned),
          })),
      }))),
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[GET /api/courses/[id]]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
