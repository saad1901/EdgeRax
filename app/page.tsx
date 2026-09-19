"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles, TrendingUp, BookOpen, Users, Award } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { CourseCard } from "@/components/course-card"
import { coursesApi } from "@/lib/api"
import { useSession } from "@/lib/session"
import type { Course } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function HomePage() {
  const { user } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  useEffect(() => {
    coursesApi.list().then(setCourses).catch(console.error).finally(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((c) => c.category)))],
    [courses]
  )

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesCat = activeCategory === "All" || c.category === activeCategory
      const q = query.trim().toLowerCase()
      const matchesQ = !q || c.title.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      return matchesCat && matchesQ
    })
  }, [courses, activeCategory, query])

  const totalStudents = useMemo(() =>
    courses.reduce((s, c) => s + (c.students || 0), 0), [courses])

  return (
    <AppShell>
      <div className="flex flex-col gap-10">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-5 py-6 text-primary-foreground md:px-10 md:py-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {/* Title + badge */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-primary-foreground/70 text-xs font-medium w-fit rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5">
                <Sparkles className="size-3 shrink-0" />
                {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Start learning today"}
              </div>
              <h1 className="text-lg font-extrabold tracking-tight leading-snug md:text-2xl">
                Learn Skills That Build Your Future
              </h1>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-xs shrink-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses…"
                className="h-10 pl-9 bg-background text-foreground placeholder:text-muted-foreground shadow-sm border-0 text-sm"
                aria-label="Search courses"
              />
            </div>
          </div>

          {/* Stats — desktop only */}
          {!loading && courses.length > 0 && (
            <div className="relative mt-4 hidden sm:flex flex-wrap items-center gap-5 border-t border-white/15 pt-4 text-xs text-primary-foreground/75">
              <span className="flex items-center gap-1.5 font-medium"><BookOpen className="size-3.5" />{courses.length} courses</span>
              <span className="flex items-center gap-1.5 font-medium"><Users className="size-3.5" />{totalStudents.toLocaleString()}+ students</span>
              <span className="flex items-center gap-1.5 font-medium"><Award className="size-3.5" />Certificates</span>
              <span className="flex items-center gap-1.5 font-medium"><TrendingUp className="size-3.5" />Expert instructors</span>
            </div>
          )}
        </section>

        {/* ── Category filters ── */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 scrollbar-none"
          role="group"
          aria-label="Filter by category"
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 rounded-full"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* ── Course grid ── */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {activeCategory === "All" ? "All Courses" : activeCategory}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length})
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="size-8" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>No courses found</EmptyTitle>
                <EmptyDescription>
                  Try adjusting your search or selecting a different category.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>

      </div>
    </AppShell>
  )
}
