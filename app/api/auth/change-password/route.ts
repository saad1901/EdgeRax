import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required." }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 })
    }

    const rows = await db.select().from(users).where(eq(users.id, user.id))
    const storedUser = rows[0]
    if (!storedUser || !(await verifyPassword(currentPassword, storedUser.password))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 })
    }

    const hashed = await hashPassword(newPassword)
    await db.update(users).set({ password: hashed }).where(eq(users.id, user.id))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[change-password]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
