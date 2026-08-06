import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { db } from "@/lib/db"
import { referralPaymentReceipts } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const parts = url.pathname.split("/").filter(Boolean)
  const id = parts[parts.length - 1]

  const [r] = await db.select().from(referralPaymentReceipts).where(eq(referralPaymentReceipts.id, id))
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (r.userId !== user.id && user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const filePath = r.filePath
  if (!filePath || !fs.existsSync(filePath)) return NextResponse.json({ error: "File missing" }, { status: 404 })

  const data = await fs.promises.readFile(filePath)
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${r.receiptNo}.pdf"`,
    },
  })
}
