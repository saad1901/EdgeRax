import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revenueShares } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/** GET /api/admin/shares — list all revenue shares */
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  const rows = await db.select().from(revenueShares)
  return NextResponse.json(rows)
}

/** POST /api/admin/shares — create a new share entry */
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  try {
    const { name, designation, percentage } = await req.json()
    if (!String(name ?? "").trim())
      return NextResponse.json({ error: "Name is required." }, { status: 400 })
    const pct = Number(percentage)
    if (isNaN(pct) || pct < 0 || pct > 100)
      return NextResponse.json({ error: "Percentage must be between 0 and 100." }, { status: 400 })

    const now = new Date().toISOString()
    const row = {
      id:          uid("share"),
      name:        String(name).trim(),
      designation: String(designation ?? "").trim(),
      percentage:  Math.round(pct * 100) / 100,
      createdAt:   now,
      updatedAt:   now,
    }
    await db.insert(revenueShares).values(row)
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/shares]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
