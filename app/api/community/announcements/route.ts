import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityAnnouncements, communityMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Admins can view all community content
  if (user.role === "admin") {
    const announcements = await db.select().from(communityAnnouncements).orderBy(communityAnnouncements.createdAt)
    return NextResponse.json(announcements)
  }

  const memberRows = await db.select().from(communityMembers)
    .where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "active")))

  if (memberRows.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const announcements = await db.select().from(communityAnnouncements).orderBy(communityAnnouncements.createdAt)
  return NextResponse.json(announcements)
}
