import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { sendBulkMail } from "@/lib/email"

/**
 * POST /api/admin/email/send
 * Multipart form data:
 *   subject     string
 *   body        HTML string
 *   userIds     JSON array of user IDs  (optional)
 *   courseId    string — if set, adds all purchasers of this course (optional)
 *   file*       one or more File attachments (optional)
 *
 * Recipients are de-duplicated before sending.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const form    = await req.formData()
    const subject = String(form.get("subject") ?? "").trim()
    const body    = String(form.get("body")    ?? "").trim()
    const userIds: string[] = JSON.parse(String(form.get("userIds") ?? "[]"))
    const courseId = String(form.get("courseId") ?? "").trim() || null

    if (!subject) return NextResponse.json({ error: "Subject is required."  }, { status: 400 })
    if (!body)    return NextResponse.json({ error: "Email body is required." }, { status: 400 })

    // Collect all target emails
    const emailSet = new Set<string>()

    // From explicit user IDs
    if (userIds.length > 0) {
      const allUsers = await db.select({ id: users.id, email: users.email }).from(users)
      for (const u of allUsers as { id: string; email: string }[]) {
        if (userIds.includes(u.id)) emailSet.add(u.email)
      }
    }

    // From course purchasers
    if (courseId) {
      const allUsers = await db.select({ id: users.id, email: users.email }).from(users)
      const coursePurchases = await db.select({ userId: purchases.userId }).from(purchases).where(eq(purchases.courseId, courseId))
      const userMap = new Map<string, string>()
      for (const u of allUsers as { id: string; email: string }[]) {
        userMap.set(u.id, u.email)
      }
      for (const p of coursePurchases as { userId: string }[]) {
        const email = userMap.get(p.userId)
        if (typeof email === "string") emailSet.add(email)
      }
    }

    if (emailSet.size === 0)
      return NextResponse.json({ error: "No recipients found." }, { status: 400 })

    // Collect file attachments
    const attachments: { filename: string; content: Buffer }[] = []
    for (const [key, value] of form.entries()) {
      if (key === "file" && value instanceof File) {
        const buf = Buffer.from(await value.arrayBuffer())
        attachments.push({ filename: value.name, content: buf })
      }
    }

    const sent = await sendBulkMail(
      [...emailSet],
      subject,
      body,
      attachments.length > 0 ? attachments : undefined,
    )

    return NextResponse.json({ ok: true, sent, total: emailSet.size })
  } catch (err) {
    console.error("[POST /api/admin/email/send]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
