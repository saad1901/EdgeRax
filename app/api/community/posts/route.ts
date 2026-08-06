import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityPosts, communityMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Admins can view all community content
  if (user.role === "admin") {
    const posts = await db.select().from(communityPosts).where(eq(communityPosts.deleted, false)).orderBy(communityPosts.createdAt)
    return NextResponse.json(posts)
  }

  const memberRows = await db.select().from(communityMembers).where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "active")))
  if (memberRows.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const posts = await db.select().from(communityPosts).where(eq(communityPosts.deleted, false)).orderBy(communityPosts.createdAt)
  return NextResponse.json(posts)
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
  const imageUrls = body.imageUrl ? [body.imageUrl] : []
  const attachmentList = Array.isArray(body.attachments) ? body.attachments : imageUrls
  const post = {
    id: uid('cpost'),
    userId: user.id,
    title: body.title ?? '',
    body: body.body ?? '',
    attachments: JSON.stringify(attachmentList),
    tags: JSON.stringify(body.tags ?? []),
    pinned: false,
    deleted: false,
  }

  await db.insert(communityPosts).values(post)
  return NextResponse.json(post, { status: 201 })
}
