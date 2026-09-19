"use client"

import Link from "next/link"
import {
  Star, Users, PlayCircle, CheckCircle2, Calendar,
  Award, Zap, Clock, Lock, BookOpen,
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Course } from "@/lib/types"
import { formatPrice, totalLessons } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Props {
  course: Course
  owned?: boolean
  /** Progress percentage 0-100 (only shown when owned) */
  progress?: number
}

const STATUS_CONFIG: Record<NonNullable<Course["status"]>, { label: string; dot: string }> = {
  upcoming: { label: "Upcoming", dot: "bg-amber-400" },
  ongoing:  { label: "Live",     dot: "bg-green-400 animate-pulse" },
  recorded: { label: "Recorded", dot: "bg-blue-400"  },
}

function formatStartDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

/** Tiny circular progress ring shown on owned course cards */
function ProgressRing({ value }: { value: number }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="relative shrink-0 size-10 flex items-center justify-center">
      {/* SVG ring — rotated so progress starts from the top */}
      <svg width="40" height="40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} strokeWidth="4" className="fill-none stroke-muted" />
        <circle
          cx="20" cy="20" r={r} strokeWidth="4"
          className="fill-none stroke-primary transition-all duration-500"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {/* Text sits in normal flow, unaffected by the SVG rotation */}
      <span className="relative text-[9px] font-bold leading-none text-foreground">
        {value}%
      </span>
    </div>
  )
}

export function CourseCard({ course, owned = false, progress }: Props) {
  const href = owned ? `/learn/${course.id}` : `/courses/${course.id}`
  const lessonCount = totalLessons(course.chapters)
  const statusCfg = course.status ? STATUS_CONFIG[course.status] : null

  const displayStudents = (() => {
    const mode = course.studentCountMode ?? "actual"
    const actual = course.students ?? 0
    const marketing = course.marketingStudentCount ?? 0
    if (mode === "custom")  return marketing
    if (mode === "total")   return actual + marketing
    return actual
  })()

  return (
    <Card className={cn(
      "group overflow-hidden p-0 border border-border/80 hover:border-primary/60 transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5",
      owned && "ring-1 ring-primary/20"
    )}>
      {/* Thumbnail */}
      <Link href={href} className="block">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={course.thumbnail || "/placeholder.svg"}
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Category pill */}
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 backdrop-blur-sm bg-background/80 shadow-sm"
          >
            {course.category}
          </Badge>

          {/* Owned overlay */}
          {owned && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg">
                <PlayCircle className="size-4" />
                Continue learning
              </div>
            </div>
          )}

          {/* Completed badge */}
          {owned && progress === 100 && (
            <div className="absolute bottom-3 right-3">
              <Badge className="gap-1 bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="size-3" /> Completed
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-col gap-2 px-4 pt-4 pb-0">
        {/* Tags row: Status + Urgency/Marketing label */}
        {(statusCfg || course.urgencyLabel) && (
          <div className="flex flex-wrap items-center gap-2">
            {statusCfg && (
              <div className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 text-xs font-semibold leading-none text-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", statusCfg.dot)} />
                <span>{statusCfg.label}</span>
              </div>
            )}

            {course.urgencyLabel && (
              <div className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 text-xs font-semibold leading-none text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-400">
                <Zap className="size-3.5 shrink-0" />
                <span>{course.urgencyLabel}</span>
              </div>
            )}
          </div>
        )}

        {/* Start date */}
        {course.startDate && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {formatStartDate(course.startDate)}
          </span>
        )}

        {/* Title */}
        <Link href={href}>
          <h3 className="line-clamp-2 text-balance text-sm font-bold leading-snug hover:text-primary transition-colors">
            {course.title}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground">by <span className="font-medium text-foreground/80">{course.instructor}</span></p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-500 dark:text-amber-400">
            <Star className="size-3 fill-current" />
            {course.rating || "New"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {displayStudents.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3" />
            {lessonCount} lessons
          </span>
          {course.certificatesEnabled && (
            <span className="inline-flex items-center gap-1 text-primary font-medium">
              <Award className="size-3" />
              Certificate
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-3">
        {owned ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm font-semibold text-primary">
              {(progress ?? 0) > 0 && progress !== 100 ? "In progress" : progress === 100 ? "Completed" : "Start learning"}
            </span>
            {progress !== undefined && (
              <ProgressRing value={progress} />
            )}
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold">{formatPrice(course.price)}</span>
              {course.originalPrice != null && course.originalPrice > course.price && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(course.originalPrice)}
                  </span>
                  <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                  </span>
                </>
              )}
            </div>
            {course.validityDays && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <Clock className="size-3" />{course.validityDays}d
              </span>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
