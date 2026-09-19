import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityPosts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * DELETE /api/community/[courseId]/posts/[id]
 * Admin or post author can delete (soft delete).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.select().from(communityPosts).where(eq(communityPosts.id, id))
  const post = rows[0]
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (user.role !== "admin" && post.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.update(communityPosts).set({ deleted: true }).where(eq(communityPosts.id, id))
  return NextResponse.json({ ok: true })
}
