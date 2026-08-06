import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type User     = InferSelectModel<typeof users>
type Course   = InferSelectModel<typeof courses>
type Purchase = InferSelectModel<typeof purchases>

/**
 * GET /api/admin/students
 * Returns every non-admin user with their full list of purchased courses.
 */
export async function GET() {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allUsers, allCourses, allPurchases] = await Promise.all([
    db.select().from(users),
    db.select().from(courses),
    db.select().from(purchases),
  ]) as [User[], Course[], Purchase[]]

  const students = allUsers
    .filter((u: User) => u.role === "user")
    .map((u: User) => {
      const userPurchases = allPurchases.filter((p: Purchase) => p.userId === u.id)
      return {
        id:              u.id,
        name:            u.name,
        email:           u.email,
        phone:           u.phone ?? null,
        referralPercent: u.referralPercent ?? null,
        createdAt:       u.createdAt,
        enrollments: userPurchases.map((p: Purchase) => {
          const course = allCourses.find((c: Course) => c.id === p.courseId)
          return {
            purchaseId:  p.id,
            courseId:    p.courseId,
            courseTitle: course?.title ?? "Deleted course",
            amount:      p.amount,
            paymentId:   p.paymentId,
            purchasedAt: p.purchasedAt,
          }
        }),
      }
    })

  return NextResponse.json(students)
}
