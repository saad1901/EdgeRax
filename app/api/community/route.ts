import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, communityMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const purchasesRows = await db.select().from(purchases).where(eq(purchases.userId, user.id))
  const membershipRows = await db.select().from(communityMembers).where(eq(communityMembers.userId, user.id))

  if (purchasesRows.length > 0 && membershipRows.length === 0) {
    const membership = {
      id: uid("cm"),
      userId: user.id,
      status: "active",
    }
    await db.insert(communityMembers).values(membership)
    return NextResponse.json({ hasAccess: true, membership })
  }

  return NextResponse.json({
    hasAccess: purchasesRows.length > 0,
    membership: membershipRows[0] ?? null,
  })
}
