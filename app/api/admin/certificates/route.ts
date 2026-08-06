import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { certificates, users, courses } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

/**
 * GET /api/admin/certificates?q=<search>
 * Returns all certificates enriched with student name/email and course title.
 * Optional ?q= filters by student name, email, course title, or certificate number.
 */
export async function GET(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allCerts, allUsers, allCourses] = await Promise.all([
    db.select().from(certificates),
    db.select().from(users),
    db.select().from(courses),
  ])

  const enriched = (allCerts as any[])
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .map((cert) => {
      const u = (allUsers as any[]).find((u) => u.id === cert.userId)
      const c = (allCourses as any[]).find((c) => c.id === cert.courseId)
      return {
        ...cert,
        studentName:  u?.name  ?? "Unknown",
        studentEmail: u?.email ?? "",
        courseTitle:  c?.title ?? "Unknown course",
      }
    })

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase()
  if (!q) return NextResponse.json(enriched)

  const filtered = enriched.filter((cert: any) =>
    cert.studentName.toLowerCase().includes(q)  ||
    cert.studentEmail.toLowerCase().includes(q) ||
    cert.courseTitle.toLowerCase().includes(q)  ||
    cert.certificateNumber.toLowerCase().includes(q),
  )

  return NextResponse.json(filtered)
}
