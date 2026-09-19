import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { internships } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * GET /api/internships/[id]
 * Public — returns a single internship.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const rows = await db.select().from(internships).where(eq(internships.id, id))
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json(rows[0])
}
