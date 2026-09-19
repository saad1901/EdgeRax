import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityChatMessages, courses, purchases, users } from "@/lib/db/schema"
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
 * GET /api/community/[courseId]/messages
 * Returns chat messages for this course's community room.
 * roomId is stored as the courseId in communityChatMessages.
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

  const messages = await db.select()
    .from(communityChatMessages)
    .where(and(eq(communityChatMessages.roomId, courseId), eq(communityChatMessages.deleted, false)))
    .orderBy(communityChatMessages.createdAt)

  const userRows = await db.select({ id: users.id, name: users.name, role: users.role }).from(users) as SenderRow[]
  const userById = new Map<string, SenderRow>(userRows.map((u) => [u.id, u]))

  return NextResponse.json(messages.map((message: any) => {
    const sender = userById.get(message.userId)
    return {
      ...message,
      _senderName: firstName(sender?.name),
      _senderRole: sender?.role ?? "user",
    }
  }))
}

/**
 * POST /api/community/[courseId]/messages
 * Body: { message: string, attachmentUrl?: string }
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
  if (!body.message?.trim() && !body.attachmentUrl) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 })
  }

  const item = {
    id: uid("cmsg"),
    userId: user.id,
    roomId: courseId,
    message: (body.message ?? "").trim(),
    attachmentUrl: body.attachmentUrl ?? null,
    attachmentType: body.attachmentType ?? null,
    replyToId: null,
  }
  await db.insert(communityChatMessages).values(item)
  return NextResponse.json({
    ...item,
    _senderName: firstName(user.name),
    _senderRole: user.role,
  }, { status: 201 })
}
