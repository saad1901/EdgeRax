import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, gt, isNull } from "drizzle-orm"
import { deleteAllSessions, hashPassword } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensurePasswordResetTable } from "@/lib/db/password-reset"
import { passwordResetTokens, users } from "@/lib/db/schema"

export async function POST(req: NextRequest) {
  try {
    await ensurePasswordResetTable()
    const { token, password } = await req.json()
    const rawToken = String(token ?? "")
    const newPassword = String(password ?? "")

    if (!/^[a-f0-9]{64}$/.test(rawToken)) {
      return NextResponse.json({ error: "This password reset link is invalid or has expired." }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    const tokenRows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash))
    const resetToken = tokenRows[0]
    if (!resetToken || resetToken.usedAt || new Date(String(resetToken.expiresAt)).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This password reset link is invalid or has expired." }, { status: 400 })
    }

    const passwordHash = await hashPassword(newPassword)
    let resetCompleted = false
    await db.transaction(async (tx: any) => {
      const now = new Date().toISOString()
      const claimResult: any = await tx.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.id, resetToken.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ))
      const resultHeader = Array.isArray(claimResult) ? claimResult[0] : claimResult
      if (Number(resultHeader?.affectedRows ?? 0) !== 1) return

      await tx.update(users).set({ password: passwordHash }).where(eq(users.id, resetToken.userId))
      resetCompleted = true
    })

    if (!resetCompleted) {
      return NextResponse.json({ error: "This password reset link is invalid or has expired." }, { status: 400 })
    }

    await deleteAllSessions(resetToken.userId)
    return NextResponse.json({ message: "Your password has been reset. You can now log in." })
  } catch (error) {
    console.error("[reset-password]", error)
    return NextResponse.json({ error: "Unable to reset the password. Please try again." }, { status: 500 })
  }
}
