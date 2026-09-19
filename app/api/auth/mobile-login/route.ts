import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, referralCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  verifyPassword, hashPassword, signToken, setAuthCookie,
  isDeviceLimitReached, createSession, uid,
} from "@/lib/auth"
import { sendAutoEmail } from "@/lib/email-auto"

/**
 * POST /api/auth/mobile-login
 * Used by the React Native app.
 *
 * Unlike the web login, this returns the raw JWT token in the response body
 * so the mobile app can store it in SecureStore and attach it as a Cookie
 * header on subsequent requests.
 *
 * Body (login):  { email, password }
 * Body (signup): { name, email, password, phone, isSignup: true }
 *
 * Response: { user, token }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, isSignup } = body

    if (!email || !password)
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })

    // ── Signup flow ─────────────────────────────────────────────────────────
    if (isSignup) {
      const { name, phone } = body
      if (!name?.trim())
        return NextResponse.json({ error: "Name is required." }, { status: 400 })
      if (!phone?.trim())
        return NextResponse.json({ error: "Phone number is required." }, { status: 400 })
      if (!/^[6-9]\d{9}$/.test(phone.trim()))
        return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
      if (password.length < 6)
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })

      const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
      if (existing.length > 0)
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })

      const hash    = await hashPassword(password)
      const newUser = {
        id:    uid("user"),
        name:  name.trim(),
        email: email.toLowerCase().trim(),
        password: hash,
        phone: phone.trim(),
        role:  "user" as const,
      }
      await db.insert(users).values(newUser)

      const newCode = uid("ref").replace(/-/g, "").slice(0, 12).toUpperCase()
      await db.insert(referralCodes).values({ id: uid("rc"), userId: newUser.id, code: newCode })

      const token = await signToken({ sub: newUser.id, role: newUser.role })
      await setAuthCookie(token)
      await createSession(newUser.id, token, "Android/iOS App", req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "")

      return NextResponse.json(
        { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }, token },
        { status: 201 }
      )
    }

    // ── Login flow ──────────────────────────────────────────────────────────
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.password)))
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })

    if (user.role === "user" && await isDeviceLimitReached(user.id)) {
      return NextResponse.json(
        { error: "Device limit reached.", sessionLimitReached: true, pendingEmail: email.toLowerCase() },
        { status: 403 }
      )
    }

    const token = await signToken({ sub: user.id, role: user.role })
    await setAuthCookie(token)
    await createSession(user.id, token, "Android/iOS App", req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "")

    sendAutoEmail("login", { name: user.name, email: user.email }).catch(() => {})

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    })
  } catch (err) {
    console.error("[mobile-login]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
