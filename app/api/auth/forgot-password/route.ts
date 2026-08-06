import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { uid } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensurePasswordResetTable } from "@/lib/db/password-reset"
import { passwordResetTokens, users } from "@/lib/db/schema"
import { getAppUrl, sendPasswordResetEmail } from "@/lib/mail"

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent."
const COOLDOWN_MS = 60 * 1000
const EXPIRY_MS = 30 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    await ensurePasswordResetTable()
    const { email } = await req.json()
    const normalizedEmail = String(email ?? "").trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
    }

    const rows = await db.select().from(users).where(eq(users.email, normalizedEmail))
    const user = rows[0]
    if (!user) return NextResponse.json({ message: GENERIC_MESSAGE })

    const existing = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    const latestCreatedAt = existing.reduce((latest: number, row: any) =>
      Math.max(latest, new Date(String(row.createdAt)).getTime()), 0)
    if (Date.now() - latestCreatedAt < COOLDOWN_MS) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const tokenId = uid("reset")

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    await db.insert(passwordResetTokens).values({
      id: tokenId,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
    })

    try {
      const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
    } catch (error) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId))
      console.error("[forgot-password] Could not send reset email:", error)
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error("[forgot-password]", error)
    // Keep the response identical for known and unknown accounts.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}
