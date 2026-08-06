import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityPosts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await db.update(communityPosts).set({ deleted: true }).where(eq(communityPosts.id, id))
  return NextResponse.json({ ok: true })
}
