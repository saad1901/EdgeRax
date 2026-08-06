"use client"

import { useEffect, useMemo, useState } from "react"
import { BadgeIndianRupee, CalendarDays, List, RotateCcw } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import {
  adminApi,
  type AdminInstructor,
  type InstructorRevenueReport,
} from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ReportView = "individual" | "monthly"

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currency.format(value)
}

export default function InstructorRevenuePage() {
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [instructorId, setInstructorId] = useState("all")
  const [courseId, setCourseId] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [view, setView] = useState<ReportView>("individual")
  const [report, setReport] = useState<InstructorRevenueReport | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([adminApi.listInstructors(), adminApi.listCourses()])
      .then(([instructorRows, courseRows]) => {
        if (!active) return
        setInstructors(instructorRows)
        setCourses(courseRows)
      })
      .catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setMetadataLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (from && to && from > to) {
      setError("The start date cannot be after the end date.")
      setReportLoading(false)
      return
    }

    let active = true
    setReportLoading(true)
    setError("")
    adminApi.instructorRevenue({
      instructorId: instructorId === "all" ? undefined : instructorId,
      courseId: courseId === "all" ? undefined : courseId,
      from: from || undefined,
      to: to || undefined,
    })
      .then((data) => { if (active) setReport(data) })
      .catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setReportLoading(false) })
    return () => { active = false }
  }, [instructorId, courseId, from, to])

  const selectedInstructor = instructors.find((instructor) => instructor.id === instructorId)
  const availableCourses = useMemo(() => {
    if (instructorId === "all") return courses
    return courses.filter((course) =>
      course.instructorId === instructorId
      || (!course.instructorId && course.instructor.trim().toLowerCase() === selectedInstructor?.name.trim().toLowerCase()),
    )
  }, [courses, instructorId, selectedInstructor])

  function selectInstructor(value: string | null) {
    const next = value ?? "all"
    setInstructorId(next)
    if (courseId !== "all") {
      const selectedCourse = courses.find((course) => course.id === courseId)
      const instructor = instructors.find((row) => row.id === next)
      const belongsToInstructor = next === "all"
        || selectedCourse?.instructorId === next
        || (!selectedCourse?.instructorId
          && selectedCourse?.instructor.trim().toLowerCase() === instructor?.name.trim().toLowerCase())
      if (!belongsToInstructor) setCourseId("all")
    }
  }

  function resetFilters() {
    setInstructorId("all")
    setCourseId("all")
    setFrom("")
    setTo("")
  }

  const hasFilters = instructorId !== "all" || courseId !== "all" || Boolean(from) || Boolean(to)
  const totals = report?.totals

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instructor revenue</h1>
          <p className="text-muted-foreground">Review course sales and the commission owed to each instructor.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report filters</CardTitle>
            <CardDescription>All filters are optional. Leave them blank to include every transaction.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="grid gap-2">
              <Label htmlFor="revenue-instructor">Instructor</Label>
              <Select value={instructorId} onValueChange={selectInstructor} disabled={metadataLoading}>
                <SelectTrigger id="revenue-instructor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All instructors</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.name} ({Number(instructor.commissionPercent)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="revenue-course">Course</Label>
              <Select value={courseId} onValueChange={(value) => setCourseId(value ?? "all")} disabled={metadataLoading}>
                <SelectTrigger id="revenue-course" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="revenue-from">From date</Label>
              <Input id="revenue-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="revenue-to">To date</Label>
              <Input id="revenue-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={resetFilters} disabled={!hasFilters}>
                <RotateCcw data-icon="inline-start" />Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1" aria-label="Data view">
            <Button
              variant={view === "individual" ? "default" : "ghost"}
              onClick={() => setView("individual")}
              aria-pressed={view === "individual"}
            >
              <List data-icon="inline-start" />Individual
            </Button>
            <Button
              variant={view === "monthly" ? "default" : "ghost"}
              onClick={() => setView("monthly")}
              aria-pressed={view === "monthly"}
            >
              <CalendarDays data-icon="inline-start" />Month wise
            </Button>
          </div>
          {reportLoading && report && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Updating…</span>}
        </div>

        {error ? (
          <Card className="border-destructive/50 p-6 text-sm text-destructive">{error}</Card>
        ) : !report ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardDescription>Transactions</CardDescription></CardHeader>
                <CardContent className="text-2xl font-bold">{totals?.transactionCount ?? 0}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Gross revenue</CardDescription></CardHeader>
                <CardContent className="text-2xl font-bold">{formatCurrency(totals?.grossRevenue ?? 0)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Instructor commission</CardDescription></CardHeader>
                <CardContent className="text-2xl font-bold text-primary">{formatCurrency(totals?.commissionAmount ?? 0)}</CardContent>
              </Card>
            </div>

            <Card className={cn("overflow-hidden p-0 transition-opacity", reportLoading && "opacity-60")}>
              {view === "individual" ? (
                report.transactions.length === 0 ? <EmptyReport /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="hidden lg:table-cell">Instructor</TableHead>
                        <TableHead className="hidden xl:table-cell">Payment ID</TableHead>
                        <TableHead className="text-right">Sale</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Rate</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.transactions.map((row) => (
                        <TableRow key={row.purchaseId}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(row.purchasedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{row.studentName}</p>
                            <p className="max-w-44 truncate text-xs text-muted-foreground">{row.studentEmail}</p>
                          </TableCell>
                          <TableCell className="max-w-56 truncate" title={row.courseTitle}>{row.courseTitle}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{row.instructorName}</TableCell>
                          <TableCell className="hidden xl:table-cell max-w-40 truncate font-mono text-xs text-muted-foreground" title={row.paymentId}>{row.paymentId}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{row.commissionPercent}%</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(row.commissionAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <ReportFooter columns={8} totals={report.totals} />
                  </Table>
                )
              ) : report.monthly.length === 0 ? <EmptyReport /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="hidden md:table-cell">Instructor</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Gross revenue</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.monthly.map((row, index) => (
                      <TableRow key={row.id} className={cn(index > 0 && report.monthly[index - 1].month !== row.month && "border-t-2")}>
                        <TableCell className="font-medium">{row.monthLabel}</TableCell>
                        <TableCell className="max-w-64 truncate" title={row.courseTitle}>{row.courseTitle}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{row.instructorName}</TableCell>
                        <TableCell className="text-right">{row.transactionCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.grossRevenue)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{row.commissionPercent}%</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.commissionAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <ReportFooter columns={7} totals={report.totals} />
                </Table>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}

function EmptyReport() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-muted-foreground">
      <BadgeIndianRupee className="size-10 opacity-40" />
      <p className="font-medium">No transactions match these filters.</p>
    </div>
  )
}

function ReportFooter({
  columns,
  totals,
}: {
  columns: number
  totals: InstructorRevenueReport["totals"]
}) {
  return (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={columns}>
          <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-1 py-1">
            <span>{totals.transactionCount} transaction{totals.transactionCount === 1 ? "" : "s"}</span>
            <span>Gross: {formatCurrency(totals.grossRevenue)}</span>
            <span className="font-bold">Commission total: {formatCurrency(totals.commissionAmount)}</span>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  )
}
