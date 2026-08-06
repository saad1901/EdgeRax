import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityChatMessages, communityMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Admins can view all community content
  if (user.role === "admin") {
    const messages = await db.select().from(communityChatMessages).orderBy(communityChatMessages.createdAt)
    return NextResponse.json(messages)
  }

  const memberRows = await db.select().from(communityMembers).where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "active")))
  if (memberRows.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const messages = await db.select().from(communityChatMessages).orderBy(communityChatMessages.createdAt)
  return NextResponse.json(messages)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Admins can post without membership
  if (user.role !== "admin") {
    const memberRows = await db.select().from(communityMembers).where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "active")))
    if (memberRows.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const item = {
    id: uid("cmsg"),
    userId: user.id,
    roomId: body.roomId ?? "general",
    message: body.message ?? "",
    attachmentUrl: body.attachmentUrl ?? null,
    attachmentType: body.attachmentType ?? null,
    replyToId: body.replyToId ?? null,
  }
  await db.insert(communityChatMessages).values(item)
  return NextResponse.json(item, { status: 201 })
}
