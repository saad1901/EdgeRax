import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { communityChatMessages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await db.update(communityChatMessages).set({ deleted: true }).where(eq(communityChatMessages.id, id))
  return NextResponse.json({ ok: true })
}
