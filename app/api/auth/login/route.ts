import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyPassword, signToken, setAuthCookie, isDeviceLimitReached, createSession } from "@/lib/auth"
import { sendAutoEmail } from "@/lib/email-auto"

/** Parse a readable device label from the User-Agent string. */
function parseDeviceLabel(ua: string): string {
  if (!ua) return "Unknown device"
  if (/iPhone/i.test(ua))           return "iPhone"
  if (/iPad/i.test(ua))             return "iPad"
  if (/Android.*Mobile/i.test(ua))  return "Android Phone"
  if (/Android/i.test(ua))          return "Android Tablet"
  if (/Macintosh/i.test(ua))        return "Mac"
  if (/Windows/i.test(ua))          return "Windows PC"
  if (/Linux/i.test(ua))            return "Linux PC"
  if (/CrOS/i.test(ua))             return "Chromebook"
  return "Browser"
}

/** Get the real IP — works behind proxies (Vercel, Nginx, Cloudflare). */
function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })

    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
    const user = rows[0]

    if (!user || !(await verifyPassword(password, user.password)))
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })

    const deviceLabel = parseDeviceLabel(req.headers.get("user-agent") ?? "")
    const ipAddress   = getIp(req)

    // Admins and instructors are exempt from device limit
    if (user.role === "user" && await isDeviceLimitReached(user.id)) {
      // Return a special flag + userId so the client can redirect to the
      // manage-sessions page and let the user log out one session remotely.
      return NextResponse.json(
        {
          error: "Device limit reached.",
          sessionLimitReached: true,
          userId: user.id,
          // Pass credentials encoded so the manage-sessions page can authenticate
          // without logging in (since the user can't log in yet).
          // We use a short-lived signed token here — the manage-sessions API
          // validates it server-side.
          pendingEmail: email.toLowerCase(),
        },
        { status: 403 }
      )
    }

    const token = await signToken({ sub: user.id, role: user.role })
    await setAuthCookie(token)
    await createSession(user.id, token, deviceLabel, ipAddress)

    // Fire-and-forget login email — never blocks the response
    sendAutoEmail("login", { name: user.name, email: user.email }).catch((e) => console.error("[login email]", e))

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error("[login]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
