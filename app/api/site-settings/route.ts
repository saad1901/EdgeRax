import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

const ALLOWED_KEYS = ["phones", "emails", "addresses"]
const NUMERIC_KEYS = ["max_devices"]

/**
 * GET /api/site-settings
 * Public — returns phones, emails, addresses as parsed arrays, plus max_devices as number.
 */
export async function GET() {
  const rows = await db.select().from(siteSettings)
  const result: Record<string, any> = { phones: [], emails: [], addresses: [], max_devices: 0 }
  for (const row of rows) {
    if (ALLOWED_KEYS.includes(row.key)) {
      try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = [] }
    }
    if (NUMERIC_KEYS.includes(row.key)) {
      result[row.key] = Number(row.value) || 0
    }
  }
  return NextResponse.json(result)
}

/**
 * PATCH /api/site-settings
 * Admin only — body: { phones?: string[]; emails?: string[]; addresses?: string[]; max_devices?: number }
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const body = await req.json()
    const now = new Date().toISOString()

    for (const key of ALLOWED_KEYS) {
      if (key in body && Array.isArray(body[key])) {
        const value = JSON.stringify(body[key].map((v: any) => String(v).trim()).filter(Boolean))
        const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key))
        if (existing.length > 0) {
          await db.update(siteSettings).set({ value, updatedAt: now }).where(eq(siteSettings.key, key))
        } else {
          await db.insert(siteSettings).values({ key, value, updatedAt: now })
        }
      }
    }

    // Handle numeric settings
    for (const key of NUMERIC_KEYS) {
      if (key in body) {
        const value = String(Math.max(0, Number(body[key]) || 0))
        const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key))
        if (existing.length > 0) {
          await db.update(siteSettings).set({ value, updatedAt: now }).where(eq(siteSettings.key, key))
        } else {
          await db.insert(siteSettings).values({ key, value, updatedAt: now })
        }
      }
    }

    // Return updated settings
    const rows = await db.select().from(siteSettings)
    const result: Record<string, any> = { phones: [], emails: [], addresses: [], max_devices: 0 }
    for (const row of rows) {
      if (ALLOWED_KEYS.includes(row.key)) {
        try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = [] }
      }
      if (NUMERIC_KEYS.includes(row.key)) {
        result[row.key] = Number(row.value) || 0
      }
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error("[PATCH /api/site-settings]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
