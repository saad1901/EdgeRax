import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyPassword, listSessions, getTokenFromCookie, getMaxDevices } from "@/lib/auth"

/**
 * GET /api/sessions?email=...&password=...
 * Lists all active sessions for a user identified by email+password.
 * Used by the manage-sessions page before the user is logged in.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const email    = searchParams.get("email")?.toLowerCase()
  const password = searchParams.get("password")

  if (!email || !password)
    return NextResponse.json({ error: "email and password are required." }, { status: 400 })

  const rows = await db.select().from(users).where(eq(users.email, email))
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password)))
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })

  const currentToken = await getTokenFromCookie()
  const [sessions, maxDevices] = await Promise.all([
    listSessions(user.id, currentToken),
    getMaxDevices(),
  ])
  return NextResponse.json({ sessions, maxDevices })
}
