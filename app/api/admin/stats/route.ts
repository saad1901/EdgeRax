import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, courses, purchases, internships, internshipApplications } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import type { InferSelectModel } from "drizzle-orm"

type Purchase = InferSelectModel<typeof purchases>
type Course   = InferSelectModel<typeof courses>
type User     = InferSelectModel<typeof users>

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const [allUsers, allCourses, allPurchases, allInternships, allApplications] = await Promise.all([
    db.select().from(users),
    db.select().from(courses),
    db.select().from(purchases),
    db.select().from(internships),
    db.select().from(internshipApplications),
  ]) as [User[], Course[], Purchase[], any[], any[]]

  const totalRevenue = allPurchases.reduce((sum: number, p: Purchase) => sum + Number(p.amount), 0)

  const revenueByCourse = allCourses.map((c: Course) => ({
    id: c.id,
    name: String(c.title).length > 14 ? String(c.title).slice(0, 14) + "…" : String(c.title),
    revenue: allPurchases
      .filter((p: Purchase) => p.courseId === c.id)
      .reduce((s: number, p: Purchase) => s + Number(p.amount), 0),
  }))

  const recent = [...allPurchases]
    .sort((a: Purchase, b: Purchase) => new Date(String(b.purchasedAt)).getTime() - new Date(String(a.purchasedAt)).getTime())
    .slice(0, 10)
    .map((p: Purchase) => ({
      ...p,
      userName:    allUsers.find((u: User) => u.id === p.userId)?.name ?? "Unknown",
      courseTitle: allCourses.find((c: Course) => c.id === p.courseId)?.title ?? "Deleted course",
    }))

  return NextResponse.json({
    totalUsers: allUsers.filter((u: User) => u.role === "user").length,
    totalSold: allPurchases.length,
    totalRevenue,
    totalCourses: allCourses.length,
    totalInternships: allInternships.length,
    totalApplications: allApplications.length,
    revenueByCourse,
    recentPurchases: recent,
  })
}
