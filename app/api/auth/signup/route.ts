import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, referralCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, signToken, setAuthCookie, createSession, uid } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json()
    if (!name?.trim() || !email?.trim() || !password)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    if (!phone?.trim())
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 })
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
    if (existing.length > 0)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })

    const hash = await hashPassword(password)
    const newUser = {
      id: uid("user"),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      phone: phone.trim(),
      role: "user" as const,
    }
    await db.insert(users).values(newUser)

    // Generate a referral code for the new user so they can share it
    const newCode = uid("ref").replace(/-/g, "").slice(0, 12).toUpperCase()
    await db.insert(referralCodes).values({
      id: uid("rc"),
      userId: newUser.id,
      code: newCode,
    })

    const token = await signToken({ sub: newUser.id, role: newUser.role })
    await setAuthCookie(token)
    await createSession(newUser.id, token, "Signup", "")

    return NextResponse.json(
      { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } },
      { status: 201 },
    )
  } catch (err) {
    console.error("[signup]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
