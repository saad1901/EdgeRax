import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityAnnouncements } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const announcements = await db.select().from(communityAnnouncements).orderBy(communityAnnouncements.createdAt)
  return NextResponse.json(announcements)
}
