import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityPosts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const posts = await db.select().from(communityPosts).orderBy(communityPosts.createdAt)
  return NextResponse.json(posts)
}
