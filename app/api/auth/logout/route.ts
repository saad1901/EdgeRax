import { NextResponse } from "next/server"
import { clearAuthCookie, deleteSession, getTokenFromCookie } from "@/lib/auth"

export async function POST() {
  // Delete the session record before clearing the cookie
  const token = await getTokenFromCookie()
  if (token) {
    try { await deleteSession(token) } catch { /* ignore — session may not exist */ }
  }
  await clearAuthCookie()
  return NextResponse.json({ ok: true })
}
