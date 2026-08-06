"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, ListTree, Percent, TrendingUp, Users } from "lucide-react"
import { InstructorShell } from "@/components/instructor-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { adminApi, instructorApi, type InstructorEarnings } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import type { Course } from "@/lib/types"

export default function InstructorDashboardPage() {
  const [courses, setCourses]     = useState<Course[]>([])
  const [earnings, setEarnings]   = useState<InstructorEarnings | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.listCourses(),
      instructorApi.earnings(),
    ])
      .then(([c, e]) => { setCourses(c); setEarnings(e) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const lessons = courses.reduce(
    (sum, course) => sum + course.chapters.reduce((inner, ch) => inner + ch.lessons.length, 0),
    0,
  )

  return (
    <InstructorShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Manage your courses, lessons, videos, and files.</p>
          </div>
          <Button nativeButton={false} render={<Link href="/instructor/courses" />}>
            <ListTree data-icon="inline-start" />Manage courses
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Courses */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Courses</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{courses.length}</span>
                  <BookOpen className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>

              {/* Lessons */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lessons</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{lessons}</span>
                  <ListTree className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>

              {/* Total sales */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total sales</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{earnings?.totalSales ?? 0}</span>
                  <Users className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>

              {/* Commission % */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Commission</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{earnings?.commissionPercent ?? 0}%</span>
                  <Percent className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Earnings summary — instructor sees only their share */}
            <div className="grid gap-4 sm:grid-cols-1 max-w-sm">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Your earnings</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{formatPrice(earnings?.totalEarnings ?? 0)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on your {earnings?.commissionPercent ?? 0}% commission
                    </p>
                  </div>
                  <TrendingUp className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Per-course earnings breakdown */}
            {earnings && earnings.perCourse.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Earnings by course</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col divide-y">
                    {earnings.perCourse.map((row) => (
                      <div key={row.courseId} className="flex items-center justify-between gap-4 py-3 text-sm">
                        <span className="min-w-0 flex-1 truncate font-medium">{row.courseTitle}</span>
                        <span className="shrink-0 text-muted-foreground">{row.sales} sale{row.sales !== 1 ? "s" : ""}</span>
                        <p className="shrink-0 font-semibold">{formatPrice(row.earnings)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </InstructorShell>
  )
}
