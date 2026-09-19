import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityChatMessages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

/**
 * DELETE /api/community/[courseId]/messages/[id]
 * Admin or the message author can delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.select().from(communityChatMessages).where(eq(communityChatMessages.id, id))
  const msg = rows[0]
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (user.role !== "admin" && msg.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.update(communityChatMessages).set({ deleted: true }).where(eq(communityChatMessages.id, id))
  return NextResponse.json({ ok: true })
}
