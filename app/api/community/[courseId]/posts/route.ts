import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityPosts, courses, purchases, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

function firstName(name: string | null | undefined) {
  return String(name ?? "").trim().split(/\s+/)[0] || "Student"
}

type SenderRow = { id: string; name: string; role: string }

async function canAccess(userId: string, userRole: string, courseId: string): Promise<boolean> {
  if (userRole === "admin") return true
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
  const course = courseRows[0]
  if (!course) return false
  if (userRole === "instructor" && course.instructorId === userId) return true
  const purchaseRows = await db.select().from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
  const purchase = purchaseRows[0]
  return Boolean(purchase && (!purchase.expiresAt || new Date(purchase.expiresAt) > new Date()))
}

/**
 * GET /api/community/[courseId]/posts
 * Returns posts tagged with this courseId.
 * We store courseId in the tags JSON array as "course:<courseId>".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!(await canAccess(user.id, user.role, courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Filter posts by courseId tag — stored as JSON array containing "course:<courseId>"
  const tag = `course:${courseId}`
  const allPosts = await db.select().from(communityPosts)
    .where(eq(communityPosts.deleted, false))
    .orderBy(communityPosts.createdAt)

  const filtered = allPosts.filter((p: any) => {
    try {
      const tags: string[] = JSON.parse(p.tags || "[]")
      return tags.includes(tag)
    } catch { return false }
  })

  const userRows = await db.select({ id: users.id, name: users.name, role: users.role }).from(users) as SenderRow[]
  const userById = new Map<string, SenderRow>(userRows.map((u) => [u.id, u]))

  return NextResponse.json(filtered.map((post: any) => {
    const sender = userById.get(post.userId)
    return {
      ...post,
      _senderName: firstName(sender?.name),
      _senderRole: sender?.role ?? "user",
    }
  }))
}

/**
 * POST /api/community/[courseId]/posts
 * Body: { title?: string, body: string, imageUrl?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!(await canAccess(user.id, user.role, courseId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 })
  }

  const tag = `course:${courseId}`
  const imageUrls = body.imageUrl ? [body.imageUrl] : []

  const post = {
    id: uid("cpost"),
    userId: user.id,
    title: (body.title ?? "").trim(),
    body: body.body.trim(),
    attachments: JSON.stringify(imageUrls),
    tags: JSON.stringify([tag]),
    pinned: false,
    deleted: false,
  }

  await db.insert(communityPosts).values(post)
  return NextResponse.json({
    ...post,
    _senderName: firstName(user.name),
    _senderRole: user.role,
  }, { status: 201 })
}
