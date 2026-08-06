import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, userSessions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { verifyPassword, deleteSessionById } from "@/lib/auth"

/**
 * DELETE /api/sessions/[id]
 * Body: { email, password }
 * Deletes a specific session by ID after verifying the user's credentials.
 * This lets a user remotely log out a device without being logged in themselves.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const { email, password } = await req.json()

  if (!email || !password)
    return NextResponse.json({ error: "email and password are required." }, { status: 400 })

  const userRows = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  const user = userRows[0]
  if (!user || !(await verifyPassword(password, user.password)))
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })

  // Ensure the session belongs to this user
  const sessionRows = await db.select().from(userSessions)
    .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, user.id)))
  if (!sessionRows[0])
    return NextResponse.json({ error: "Session not found." }, { status: 404 })

  await deleteSessionById(sessionId)
  return NextResponse.json({ ok: true })
}
