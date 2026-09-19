import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

/**
 * GET /api/internships
 * Public — returns all open/draft internship listings.
 */
export async function GET() {
  try {
    const rows = await db.select().from(internships).orderBy(asc(internships.createdAt))
    // Only expose open listings publicly
    const visible = rows.filter((r: any) => r.status !== "draft")
    return NextResponse.json(visible)
  } catch (err) {
    console.error("[GET /api/internships]", err)
    return NextResponse.json({ error: "Failed to fetch internships." }, { status: 500 })
  }
}
