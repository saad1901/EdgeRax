import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { certificates, courses, purchases, progress, lessons, chapters } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser, uid } from "@/lib/auth"
import { makeCertificateNumber, generateCertificatePdf } from "@/lib/certificate"

// ─── GET /api/certificates?courseId=xxx ───────────────────────────────────────
// Returns the current user's certificate for a specific course (if it exists).

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const courseId = req.nextUrl.searchParams.get("courseId")
  if (!courseId) return NextResponse.json({ error: "courseId required." }, { status: 400 })

  const rows = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.userId, user.id), eq(certificates.courseId, courseId)))

  return NextResponse.json(rows[0] ?? null)
}

// ─── POST /api/certificates ────────────────────────────────────────────────────
// Body: { courseId: string; certificateName: string }
// Validates 80 % completion, enforces one-certificate-per-user-per-course,
// generates the PDF, persists to DB, and returns the certificate row.

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  try {
    const { courseId, certificateName } = await req.json()

    if (!courseId || typeof courseId !== "string")
      return NextResponse.json({ error: "courseId is required." }, { status: 400 })
    if (!certificateName || typeof certificateName !== "string" || !certificateName.trim())
      return NextResponse.json({ error: "Certificate name is required." }, { status: 400 })

    const trimmedName = certificateName.trim()

    // 1. Verify the user has purchased (and not expired) this course.
    const userPurchases = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.courseId, courseId)))

    const activePurchase = userPurchases.find((p: { expiresAt: string | null }) => {
      if (!p.expiresAt) return true
      return new Date(p.expiresAt) > new Date()
    })

    if (!activePurchase)
      return NextResponse.json({ error: "You must own this course to get a certificate." }, { status: 403 })

    // 2. Idempotency: one certificate per user per course.
    const existing = await db
      .select()
      .from(certificates)
      .where(and(eq(certificates.userId, user.id), eq(certificates.courseId, courseId)))

    if (existing.length > 0)
      return NextResponse.json({ error: "A certificate for this course already exists." }, { status: 409 })

    // 3. Verify ≥ 80 % completion.
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId))
    const course = courseRows[0]
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })

    // 3a. Check certificates are enabled for this course by the instructor/admin.
    if (!course.certificatesEnabled)
      return NextResponse.json(
        { error: "Certificates are not yet available for this course. The instructor will enable them when the course is complete." },
        { status: 403 },
      )

    // Gather all lesson IDs for the course via chapters
    const courseChapters = await db.select().from(chapters).where(eq(chapters.courseId, courseId))
    const chapterIds = courseChapters.map((c: { id: string }) => c.id)

    let totalLessons = 0
    for (const chId of chapterIds) {
      const chLessons = await db.select().from(lessons).where(eq(lessons.chapterId, chId))
      totalLessons += chLessons.length
    }

    if (totalLessons === 0)
      return NextResponse.json({ error: "This course has no lessons." }, { status: 400 })

    // Count completed lessons for this user in this course
    const completedRows = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, user.id))

    const completedIds = new Set(completedRows.map((r: { lessonId: string }) => r.lessonId))

    // Intersect completed IDs against all lesson IDs in this course
    let completedInCourse = 0
    for (const chId of chapterIds) {
      const chLessons = await db.select().from(lessons).where(eq(lessons.chapterId, chId))
      completedInCourse += chLessons.filter((l: { id: string }) => completedIds.has(l.id)).length
    }

    const completionPct = (completedInCourse / totalLessons) * 100
    if (completionPct < 80)
      return NextResponse.json(
        { error: `You need to complete at least 80% of the course. Current progress: ${Math.round(completionPct)}%.` },
        { status: 403 },
      )

    // 4. Generate certificate.
    const certId     = uid("cert")
    const certNumber = makeCertificateNumber()
    const issuedAt   = new Date().toISOString()

    const pdfPath = await generateCertificatePdf({
      certificateId:     certId,
      certificateNumber: certNumber,
      studentName:       trimmedName,
      courseName:        course.title,
      issuedAt,
    })

    // 5. Persist.
    await db.insert(certificates).values({
      id:                certId,
      userId:            user.id,
      courseId,
      certificateName:   trimmedName,
      certificateNumber: certNumber,
      issuedAt,
      pdfPath,
    })

    const [inserted] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.id, certId))

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[POST /api/certificates]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
