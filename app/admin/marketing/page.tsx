"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Megaphone, Users, Save, Zap, Star } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type StudentCountMode = "actual" | "custom" | "total"

interface MarketingCourse {
  id: string
  title: string
  thumbnail: string
  students: number
  rating: number
  marketingStudentCount: number
  studentCountMode: StudentCountMode
  urgencyLabel: string
}

// Local draft state per course
interface DraftRow {
  marketingStudentCount: string
  studentCountMode: StudentCountMode
  urgencyLabel: string
  rating: string  // string for controlled input, e.g. "4.5"
  saving: boolean
  dirty: boolean
}

const MODE_LABELS: Record<StudentCountMode, string> = {
  actual: "Actual (real purchases)",
  custom: "Custom (your number only)",
  total:  "Total (actual + your number)",
}

function computePreview(course: MarketingCourse, draft: DraftRow): number {
  const actual   = course.students
  const custom   = Math.max(0, Number(draft.marketingStudentCount) || 0)
  const mode     = draft.studentCountMode
  if (mode === "custom") return custom
  if (mode === "total")  return actual + custom
  return actual
}

// ─── Star picker ─────────────────────────────────────────────────────────────
// Renders 5 stars; each star is split into left/right halves for 0.5 precision.
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star
        const half = !full && display >= star - 0.5
        return (
          <div key={star} className="relative flex h-7 w-7 cursor-pointer">
            {/* Left half → star - 0.5 */}
            <div
              className="absolute left-0 top-0 h-full w-1/2"
              onMouseEnter={() => setHovered(star - 0.5)}
              onClick={() => onChange(star - 0.5)}
              aria-label={`${star - 0.5} stars`}
            />
            {/* Right half → full star */}
            <div
              className="absolute right-0 top-0 h-full w-1/2"
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(star)}
              aria-label={`${star} stars`}
            />
            <Star
              className={[
                "size-7 transition-colors",
                full
                  ? "fill-chart-4 text-chart-4"
                  : half
                    ? "fill-chart-4/50 text-chart-4"
                    : "fill-muted text-muted-foreground/30",
              ].join(" ")}
            />
          </div>
        )
      })}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-2 text-xs text-muted-foreground hover:text-destructive"
          title="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminMarketingPage() {
  const [courses, setCourses] = useState<MarketingCourse[]>([])
  const [drafts,  setDrafts]  = useState<Record<string, DraftRow>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/marketing", { credentials: "include" })
      const data: MarketingCourse[] = await res.json()
      if (!res.ok) { toast.error("Failed to load courses."); return }
      setCourses(data)
      // Initialise draft state from server values
      const initial: Record<string, DraftRow> = {}
      for (const c of data) {
        initial[c.id] = {
          marketingStudentCount: String(c.marketingStudentCount ?? 0),
          studentCountMode:      (c.studentCountMode as StudentCountMode) ?? "actual",
          urgencyLabel:          c.urgencyLabel ?? "",
          rating:                String(c.rating ?? 0),
          saving: false,
          dirty:  false,
        }
      }
      setDrafts(initial)
    } catch {
      toast.error("Failed to load courses.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, dirty: true },
    }))
  }

  async function saveCourse(course: MarketingCourse) {
    const draft = drafts[course.id]
    if (!draft) return
    setDrafts((prev) => ({ ...prev, [course.id]: { ...prev[course.id], saving: true } }))
    try {
      const res = await fetch("/api/admin/marketing", {
        method:  "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId:              course.id,
          marketingStudentCount: Math.max(0, Number(draft.marketingStudentCount) || 0),
          studentCountMode:      draft.studentCountMode,
          urgencyLabel:          draft.urgencyLabel.trim(),
          rating:                Math.min(5, Math.max(0, Number(draft.rating) || 0)),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Save failed."); return }

      // Update courses list with fresh server values
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? {
                ...c,
                rating:                data.rating ?? c.rating,
                marketingStudentCount: data.marketingStudentCount,
                studentCountMode:      data.studentCountMode,
                urgencyLabel:          data.urgencyLabel ?? "",
              }
            : c,
        ),
      )
      setDrafts((prev) => ({ ...prev, [course.id]: { ...prev[course.id], dirty: false } }))
      toast.success(`Saved "${course.title}"`)
    } catch {
      toast.error("Save failed.")
    } finally {
      setDrafts((prev) => ({ ...prev, [course.id]: { ...prev[course.id], saving: false } }))
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Megaphone className="size-6" />
            Marketing
          </h1>
          <p className="text-muted-foreground">
            Control what's shown on each course card — student count, rating, and urgency labels.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8" />
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {courses.map((course) => {
              const draft = drafts[course.id]
              if (!draft) return null
              const preview = computePreview(course, draft)

              return (
                <Card key={course.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={course.thumbnail || "/placeholder.svg"}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{course.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5">
                          <Users className="size-3.5" />
                          {course.students.toLocaleString()} actual purchases
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Custom count input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Custom student count</label>
                        <Input
                          type="number"
                          min={0}
                          value={draft.marketingStudentCount}
                          onChange={(e) =>
                            updateDraft(course.id, { marketingStudentCount: e.target.value })
                          }
                          placeholder="e.g. 5000"
                        />
                        <p className="text-xs text-muted-foreground">
                          The number you want to display or add to real purchases.
                        </p>
                      </div>

                      {/* Mode selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Display mode</label>
                        <Select
                          value={draft.studentCountMode}
                          onValueChange={(v) =>
                            updateDraft(course.id, { studentCountMode: v as StudentCountMode })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="actual">{MODE_LABELS.actual}</SelectItem>
                            <SelectItem value="custom">{MODE_LABELS.custom}</SelectItem>
                            <SelectItem value="total">{MODE_LABELS.total}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {MODE_LABELS[draft.studentCountMode]}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                          <Star className="size-3.5 fill-chart-4 text-chart-4" />
                          Rating
                        </label>
                        {/* Clickable star picker — half-star precision via two hitboxes per star */}
                        <StarPicker
                          value={Number(draft.rating) || 0}
                          onChange={(v) => updateDraft(course.id, { rating: String(v) })}
                        />
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={draft.rating}
                            onChange={(e) => {
                              const raw = e.target.value
                              // Allow free typing; clamp only on blur
                              updateDraft(course.id, { rating: raw })
                            }}
                            onBlur={(e) => {
                              const clamped = Math.min(5, Math.max(0, Number(e.target.value) || 0))
                              updateDraft(course.id, { rating: String(Math.round(clamped * 10) / 10) })
                            }}
                            className="w-24"
                          />
                          <p className="text-xs text-muted-foreground">
                            Between 0 and 5. Shown on the card as ★ rating.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Urgency label */}
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium">
                        <Zap className="size-3.5 text-orange-500" />
                        Urgency label
                      </label>
                      <Textarea
                        rows={2}
                        maxLength={512}
                        value={draft.urgencyLabel}
                        onChange={(e) => updateDraft(course.id, { urgencyLabel: e.target.value })}
                        placeholder='e.g. "Only 10 seats left!" or "Offer ends tonight!"'
                        className="resize-none text-sm"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Shown on the course card in an orange highlight. Leave blank to hide.
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {draft.urgencyLabel.length}/512
                        </span>
                      </div>
                      {draft.urgencyLabel.trim() && (
                        <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-400">
                          <Zap className="size-3 shrink-0" />
                          {draft.urgencyLabel}
                        </div>
                      )}
                    </div>

                    {/* Preview + save row */}
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="size-4" />
                          <span className="font-semibold text-foreground tabular-nums">
                            {preview.toLocaleString()}
                          </span>
                          students
                        </span>
                        <span aria-hidden className="text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Star className="size-4 fill-chart-4 text-chart-4" />
                          <span className="font-semibold text-foreground tabular-nums">
                            {Number(draft.rating) > 0
                              ? (Math.round(Number(draft.rating) * 10) / 10).toFixed(1)
                              : "New"}
                          </span>
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveCourse(course)}
                        disabled={draft.saving || !draft.dirty}
                      >
                        {draft.saving ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
