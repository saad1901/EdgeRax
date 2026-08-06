import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityAnnouncements, communityMembers, communityReports } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const announcements = await db.select().from(communityAnnouncements)
  const members = await db.select().from(communityMembers)
  const reports = await db.select().from(communityReports)
  return NextResponse.json({ announcements, members, reports })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const item = {
    id: uid("cann"),
    body: body.body ?? "",
  }
  await db.insert(communityAnnouncements).values(item)
  return NextResponse.json(item, { status: 201 })
}
