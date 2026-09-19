"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Users, BookOpen, ArrowRight, Lock, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { coursesApi, purchasesApi, type Purchase } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"

interface AccessibleCourse {
  course: Course
  role: "student" | "instructor" | "admin"
}

export default function CommunityHubPage() {
  const router = useRouter()
  const { user, ready } = useSession()
  const [accessible, setAccessible] = useState<AccessibleCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace(`/auth?redirect=/community`)
      return
    }

    async function load() {
      try {
        const allCourses = await coursesApi.list()

        if (user!.role === "admin") {
          setAccessible(allCourses.map((c: Course) => ({ course: c, role: "admin" as const })))
          return
        }

        if (user!.role === "instructor") {
          const mine = allCourses.filter((c: Course) => c.instructorId === user!.id)
          setAccessible(mine.map((c: Course) => ({ course: c, role: "instructor" as const })))
          return
        }

        // Student: filter by active purchases
        const purchases: Purchase[] = await purchasesApi.list()
        const now = new Date()
        const courseIds = new Set(
          purchases
            .filter((p) => !p.expiresAt || new Date(p.expiresAt) > now)
            .map((p) => p.courseId)
        )
        const owned = allCourses.filter((c: Course) => courseIds.has(c.id))
        setAccessible(owned.map((c: Course) => ({ course: c, role: "student" as const })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ready, user, router])

  if (!ready || loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Spinner className="size-8" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <Users className="size-4" />
            Course Communities
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <p className="text-muted-foreground text-sm">
            Each course has its own community. Discuss lectures, ask questions, and connect with your batchmates.
          </p>
        </div>

        {accessible.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed bg-muted/30 py-16 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Lock className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No communities yet</h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
                Enroll in a course to get access to its community — chat with students, instructors, and the admin.
              </p>
            </div>
            <Button nativeButton={false} render={<Link href="/" />}>
              <BookOpen className="size-4 mr-2" />
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accessible.map(({ course, role }) => (
              <Link
                key={course.id}
                href={`/community/${course.id}`}
                className="group flex min-h-40 flex-col rounded-xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {course.category}
                  </Badge>
                  {role === "admin" && (
                    <Badge className="bg-red-600 text-white text-[10px]">Admin</Badge>
                  )}
                  {role === "instructor" && (
                    <Badge className="bg-indigo-600 text-white text-[10px]">Instructor</Badge>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      Community active
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                      Open <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
