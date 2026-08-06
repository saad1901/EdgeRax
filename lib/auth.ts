import bcrypt from "bcryptjs"
import crypto from "crypto"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { eq, count } from "drizzle-orm"
import { db } from "./db"
import { users, userSessions, siteSettings } from "./db/schema"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "edgerax-dev-secret-change-in-production"
)
const COOKIE_NAME = "edgerax_token"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ─── Crypto helpers ──────────────────────────────────────────────────────────

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  sub: string   // userId
  role: string
}

export async function signToken(payload: TokenPayload) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { sub: payload.sub as string, role: payload.role as string }
  } catch {
    return null
  }
}

// ─── Cookie helpers (server-side only) ───────────────────────────────────────

export async function setAuthCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearAuthCookie() {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getTokenFromCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}

// ─── Get current user from cookie ────────────────────────────────────────────

export async function getCurrentUser() {
  const token = await getTokenFromCookie()
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  // Password resets revoke every recorded session for the account.
  if (!await sessionExists(token)) return null
  const rows = await db.select().from(users).where(eq(users.id, payload.sub))
  return rows[0] ?? null
}

// ─── Session tracking (device limit) ─────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function getMaxDevices(): Promise<number> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "max_devices"))
  const val = Number(rows[0]?.value ?? 0)
  return isNaN(val) ? 0 : val
}

/** Returns true if the user is at or over their device limit. 0 = unlimited. */
export async function isDeviceLimitReached(userId: string): Promise<boolean> {
  const max = await getMaxDevices()
  if (max <= 0) return false
  const rows = await db.select({ count: count() }).from(userSessions).where(eq(userSessions.userId, userId))
  return (rows[0]?.count ?? 0) >= max
}

/** Record a new session token for a user. */
export async function createSession(userId: string, token: string, deviceLabel = "Unknown device", ipAddress = ""): Promise<void> {
  await db.insert(userSessions).values({
    id: uid("sess"),
    userId,
    tokenHash: hashToken(token),
    deviceLabel,
    ipAddress,
  })
}

/** Remove the session matching this token (on logout). */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.tokenHash, hashToken(token)))
}

/** Remove a session by its record ID (used by manage-sessions page). */
export async function deleteSessionById(sessionId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.id, sessionId))
}

/** Remove ALL sessions for a user (force logout everywhere). */
export async function deleteAllSessions(userId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.userId, userId))
}

/** List all active sessions for a user (excluding current token). */
export async function listSessions(userId: string, currentToken?: string | null) {
  const rows = await db.select().from(userSessions).where(eq(userSessions.userId, userId))
  const currentHash = currentToken ? hashToken(currentToken) : null
  return rows.map((s: any) => ({
    id:          s.id as string,
    deviceLabel: (s.deviceLabel ?? "Unknown device") as string,
    ipAddress:   (s.ipAddress ?? "") as string,
    createdAt:   s.createdAt as string,
    isCurrent:   s.tokenHash === currentHash,
  }))
}

/** Validate that this token has a recorded session (detects revoked tokens). */
export async function sessionExists(token: string): Promise<boolean> {
  const rows = await db.select().from(userSessions).where(eq(userSessions.tokenHash, hashToken(token)))
  return rows.length > 0
}
