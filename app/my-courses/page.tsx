"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlayCircle, LibraryBig, Compass, Clock, AlertTriangle } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { coursesApi, purchasesApi, progressApi, type Purchase } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { totalLessons, daysRemaining } from "@/lib/format"

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

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">Pick up where you left off.</p>
        </div>

        {enrolled.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrolled.map(({ course, progress, purchase }) => {
              const days = daysRemaining(purchase.expiresAt)
              const isExpired = days !== null && days <= 0
              const expiringSoon = days !== null && days > 0 && days <= 7

              return (
                <Card key={course.id} className="overflow-hidden p-0">
                  <Link href={isExpired ? `/courses/${course.id}` : `/learn/${course.id}`} className="block">
                    <div className="relative aspect-video bg-muted">
                      <img src={course.thumbnail || "/placeholder.svg"} alt={course.title}
                        className="size-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 opacity-0 transition-opacity hover:opacity-100">
                        <PlayCircle className="size-12 text-background" />
                      </div>
                      {isExpired && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Badge variant="destructive" className="text-sm px-3 py-1">Access Expired</Badge>
                        </div>
                      )}
                      {!isExpired && progress === 100 && (
                        <Badge className="absolute right-2 top-2 bg-green-600 text-white">Completed</Badge>
                      )}
                    </div>
                  </Link>
                  <CardContent className="flex flex-col gap-2 px-4 pb-4 pt-4">
                    <Badge variant="secondary" className="w-fit">{course.category}</Badge>
                    <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">by {course.instructor}</p>

                    {/* Validity indicator */}
                    {days === null ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />Lifetime access
                      </p>
                    ) : isExpired ? (
                      <p className="flex items-center gap-1 text-xs text-destructive font-medium">
                        <AlertTriangle className="size-3" />Access expired
                      </p>
                    ) : expiringSoon ? (
                      <p className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertTriangle className="size-3" />{days} day{days !== 1 ? "s" : ""} left
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />{days} day{days !== 1 ? "s" : ""} remaining
                      </p>
                    )}

                    <div className="mt-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{totalLessons(course.chapters)} lessons</span>
                        <span>{progress}% complete</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    {isExpired ? (
                      <Button className="mt-2 w-full" size="sm" variant="outline" nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
                        Renew access
                      </Button>
                    ) : (
                      <Button className="mt-2 w-full" size="sm" nativeButton={false} render={<Link href={`/learn/${course.id}`} />}>
                        <PlayCircle data-icon="inline-start" />
                        {progress > 0 ? "Continue" : "Start learning"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><LibraryBig /></EmptyMedia>
              <EmptyTitle>No courses yet</EmptyTitle>
              <EmptyDescription>You haven&apos;t enrolled in any courses. Explore the catalog to get started.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/" />}><Compass data-icon="inline-start" />Browse courses</Button>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </AppShell>
  )
}
