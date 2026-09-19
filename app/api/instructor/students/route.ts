import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type User     = InferSelectModel<typeof users>
type Course   = InferSelectModel<typeof courses>
type Purchase = InferSelectModel<typeof purchases>

/**
 * GET /api/instructor/students
 * Returns all students enrolled in courses taught by the current instructor (or all courses if admin).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== "instructor" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  // 1. Fetch instructor's courses
  const instructorCourses = (user.role === "admin"
    ? await db.select().from(courses)
    : await db.select().from(courses).where(eq(courses.instructorId, user.id))) as Course[]

  if (instructorCourses.length === 0) {
    return NextResponse.json([])
  }

  const courseIds = instructorCourses.map((c) => c.id)

  // 2. Fetch purchases for these courses
  const relevantPurchases = await db
    .select()
    .from(purchases)
    .where(inArray(purchases.courseId, courseIds)) as Purchase[]

  if (relevantPurchases.length === 0) {
    return NextResponse.json([])
  }

  // 3. Fetch user details for students who purchased
  const userIds = Array.from(new Set(relevantPurchases.map((p) => p.userId)))
  const relevantUsers = await db
    .select()
    .from(users)
    .where(inArray(users.id, userIds)) as User[]

  // 4. Group by student
  const studentMap = new Map<string, {
    id: string
    name: string
    email: string
    phone: string | null
    createdAt: string
    enrollments: Array<{
      purchaseId: string
      courseId: string
      courseTitle: string
      amount: number
      paymentId: string
      purchasedAt: string
    }>
  }>()

  for (const p of relevantPurchases) {
    const u = relevantUsers.find((userObj) => userObj.id === p.userId)
    if (!u) continue

    const courseObj = instructorCourses.find((c) => c.id === p.courseId)
    const courseTitle = courseObj?.title ?? "Course"

    let student = studentMap.get(u.id)
    if (!student) {
      student = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        createdAt: u.createdAt,
        enrollments: [],
      }
      studentMap.set(u.id, student)
    }

    student.enrollments.push({
      purchaseId: p.id,
      courseId: p.courseId,
      courseTitle,
      amount: p.amount,
      paymentId: p.paymentId,
      purchasedAt: p.purchasedAt,
    })
  }

  return NextResponse.json(Array.from(studentMap.values()))
}
