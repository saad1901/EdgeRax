"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { CourseCard } from "@/components/course-card"
import { coursesApi } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function HomePage() {
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

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-primary px-6 py-10 text-primary-foreground md:px-10 md:py-14">
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Learn Skills That Build Your Future
            </h1>
            <p className="text-pretty text-sm text-primary-foreground/80 md:text-lg">
              Master in-demand skills with high-quality courses taught by industry experts. Learn anytime, anywhere with Edgerax.
            </p>
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for courses, instructors, topics..."
            className="h-11 pl-9" aria-label="Search courses" />
        </div>

        {/* Category filters — scrollable on mobile */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group" aria-label="Filter by category">
          {categories.map((cat) => (
            <Button key={cat} size="sm" variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)} className="shrink-0">
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            {activeCategory === "All" ? "All courses" : activeCategory}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </h2>
          {loading ? (
            <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>No courses found</EmptyTitle>
                <EmptyDescription>Try adjusting your search or selecting a different category.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </AppShell>
  )
}
