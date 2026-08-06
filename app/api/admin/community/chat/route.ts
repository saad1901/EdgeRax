import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityChatMessages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const messages = await db.select().from(communityChatMessages).orderBy(communityChatMessages.createdAt)
  return NextResponse.json(messages)
}
