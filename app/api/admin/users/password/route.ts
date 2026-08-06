import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }

    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword) {
      return NextResponse.json({ error: "User ID and new password are required." }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    }

    const hashed = await hashPassword(newPassword)
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin-change-user-password]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
