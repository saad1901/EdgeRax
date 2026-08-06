import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { purchases, communityMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ hasAccess: false }, { status: 401 })

  // Admins get automatic community access
  if (user.role === "admin") {
    return NextResponse.json({ hasAccess: true, membership: { id: "admin", userId: user.id, status: "active" } })
  }

  const memberRows = await db.select().from(communityMembers)
    .where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "active")))

  if (memberRows.length > 0) {
    return NextResponse.json({ hasAccess: true, membership: memberRows[0] })
  }

  const purchaseRows = await db.select().from(purchases).where(eq(purchases.userId, user.id))
  if (purchaseRows.length === 0) {
    return NextResponse.json({ hasAccess: false })
  }

  const membership = {
    id: uid("cm"),
    userId: user.id,
    status: "active",
  }
  await db.insert(communityMembers).values(membership)

  return NextResponse.json({ hasAccess: true, membership })
}
