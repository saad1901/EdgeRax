"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlayCircle, LibraryBig, Compass, Clock, AlertTriangle, Trophy, Flame, BookOpen } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { coursesApi, purchasesApi, progressApi, type Purchase } from "@/lib/api"
import { CourseCard } from "@/components/course-card"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { totalLessons, daysRemaining } from "@/lib/format"
import { cn } from "@/lib/utils"

interface EnrolledCourse { course: Course; progress: number; purchase: Purchase }

export default function MyCoursesPage() {
  const { user, ready } = useSession()
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready || !user) return

    async function load() {
      try {
        const [allCourses, myPurchases] = await Promise.all([coursesApi.list(), purchasesApi.list()])
        const myCourses = allCourses.filter((c: Course) => myPurchases.some((p: Purchase) => p.courseId === c.id))

        const withProgress = await Promise.all(
          myCourses.map(async (c: Course) => {
            const purchase = myPurchases.find((p: Purchase) => p.courseId === c.id)!
            const completedIds = await progressApi.get(c.id).catch(() => [] as string[])
            const total = totalLessons(c.chapters)
            const pct = total > 0 ? Math.round((completedIds.length / total) * 100) : 0
            return { course: c, progress: pct, purchase }
          })
        )
        setEnrolled(withProgress)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ready, user])

  if (!ready || loading) {
    return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  }

  const completed = enrolled.filter((e) => e.progress === 100).length
  const inProgress = enrolled.filter((e) => e.progress > 0 && e.progress < 100).length
  const totalLessonsAll = enrolled.reduce((s, e) => s + totalLessons(e.course.chapters), 0)

  const active = enrolled.filter((e) => {
    const days = daysRemaining(e.purchase.expiresAt)
    return days === null || days > 0
  })
  const expired = enrolled.filter((e) => {
    const days = daysRemaining(e.purchase.expiresAt)
    return days !== null && days <= 0
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Learning</h1>
          <p className="text-muted-foreground text-sm mt-1">Pick up where you left off.</p>
        </div>

        {/* Stats bar */}
        {enrolled.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: LibraryBig, label: "Enrolled",    value: enrolled.length,    color: "text-primary"   },
              { icon: Flame,      label: "In progress", value: inProgress,          color: "text-orange-500"},
              { icon: Trophy,     label: "Completed",   value: completed,           color: "text-emerald-500"},
              { icon: BookOpen,   label: "Lessons",     value: totalLessonsAll,     color: "text-blue-500"  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
                <div className={cn("flex size-9 items-center justify-center rounded-lg bg-muted/60", color)}>
                  <Icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {enrolled.length > 0 ? (
          <div className="flex flex-col gap-8">
            {/* Active courses */}
            {active.length > 0 && (
              <section className="flex flex-col gap-4">
                {expired.length > 0 && (
                  <h2 className="text-base font-semibold text-foreground">Active Courses</h2>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map(({ course, progress }) => (
                    <CourseCard key={course.id} course={course} owned progress={progress} />
                  ))}
                </div>
              </section>
            )}

            {/* Expired courses */}
            {expired.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">Expired Access</h2>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {expired.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
                  {expired.map(({ course }) => (
                    <div key={course.id} className="relative">
                      <CourseCard course={course} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
                        <AlertTriangle className="size-8 text-destructive" />
                        <p className="text-sm font-semibold text-destructive">Access Expired</p>
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
                          Renew Access
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><LibraryBig /></EmptyMedia>
              <EmptyTitle>No courses yet</EmptyTitle>
              <EmptyDescription>
                You haven&apos;t enrolled in any courses. Explore the catalog to get started.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/" />}>
                <Compass data-icon="inline-start" />Browse courses
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </AppShell>
  )
}
