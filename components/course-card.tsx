"use client"

import Link from "next/link"
import { Star, Users, PlayCircle, CheckCircle2, Calendar, Award, Zap } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Course } from "@/lib/types"
import { formatPrice, totalLessons } from "@/lib/format"

interface Props {
  course: Course
  /** Pass true when this course is already purchased */
  owned?: boolean
}

const STATUS_CONFIG: Record<NonNullable<Course["status"]>, { label: string; className: string }> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40",
  },
  ongoing: {
    label: "Ongoing",
    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/40",
  },
  recorded: {
    label: "Recorded",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40",
  },
}

function formatStartDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export function CourseCard({ course, owned = false }: Props) {
  const href = owned ? `/learn/${course.id}` : `/courses/${course.id}`

  return (
    <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img src={course.thumbnail || "/placeholder.svg"} alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <Badge variant="secondary" className="absolute left-3 top-3 backdrop-blur">
            {course.category}
          </Badge>
          {owned && (
            <Badge className="absolute right-3 top-3 gap-1">
              <CheckCircle2 className="size-3" />Enrolled
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <PlayCircle className="size-3.5" />
            {totalLessons(course.chapters)} lessons
          </span>
          <span aria-hidden>•</span>
          <span>{course.level}</span>
        </div>
        {/* Status + start date row */}
        {(course.status || course.startDate) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {course.status && (
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium ${STATUS_CONFIG[course.status].className}`}>
                {STATUS_CONFIG[course.status].label}
              </span>
            )}
            {course.startDate && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-3" />
                {formatStartDate(course.startDate)}
              </span>
            )}
          </div>
        )}
        {/* Urgency label */}
        {course.urgencyLabel && (
          <div className="inline-flex w-fit items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-400">
            <Zap className="size-3 shrink-0" />
            {course.urgencyLabel}
          </div>
        )}
        <Link href={href}>
          <h3 className="line-clamp-2 text-balance font-semibold leading-snug hover:text-primary">
            {course.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground">by {course.instructor}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="size-3.5 fill-chart-4 text-chart-4" />
            {course.rating || "New"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {course.students.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Award className="size-3.5" />
            Certificate
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4">
        {owned
          ? <span className="font-semibold text-primary">Continue learning</span>
          : (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatPrice(course.price)}</span>
              {course.originalPrice != null && course.originalPrice > course.price && (
                <>
                  <span className="text-sm text-muted-foreground line-through">{formatPrice(course.originalPrice)}</span>
                  <span className="text-xs font-semibold text-green-600">
                    {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                  </span>
                </>
              )}
            </div>
          )
        }
      </CardFooter>
    </Card>
  )
}
