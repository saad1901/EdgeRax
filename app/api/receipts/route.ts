import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { referralPaymentReceipts } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.select().from(referralPaymentReceipts).where(eq(referralPaymentReceipts.userId, user.id))
  return NextResponse.json(rows)
}
