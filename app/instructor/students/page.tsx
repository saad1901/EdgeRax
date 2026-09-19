"use client"

import { Fragment, useEffect, useState } from "react"
import {
  Users, ChevronDown, ChevronRight, Search, BookOpen, Calendar, Phone, Mail,
} from "lucide-react"
import { InstructorShell } from "@/components/instructor-shell"
import { formatPrice } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface InstructorStudent {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  enrollments: Array<{
    purchaseId: string
    courseId: string
    courseTitle: string
    amount: number
    paymentId: string
    purchasedAt: string
  }>
}

export default function InstructorStudentsPage() {
  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function load() {
    try {
      const res = await fetch("/api/instructor/students", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load students.")
      setStudents(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load enrolled students.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.email.toLowerCase().includes(query.toLowerCase()) ||
    (s.phone && s.phone.toLowerCase().includes(query.toLowerCase())) ||
    s.enrollments.some((e) => e.courseTitle.toLowerCase().includes(query.toLowerCase()))
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <InstructorShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Enrolled Students</h1>
            <p className="text-muted-foreground">
              {students.length} student{students.length !== 1 ? "s" : ""} enrolled in your courses
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, phone, or course…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="font-medium">{query ? "No students match your search." : "No enrolled students found."}</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-center">Enrolled Courses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const open = expanded.has(student.id)

                  return (
                    <Fragment key={student.id}>
                      <TableRow
                        className={cn("cursor-pointer select-none", open && "bg-muted/40")}
                        onClick={() => toggleExpand(student.id)}
                      >
                        <TableCell className="pr-0 text-muted-foreground">
                          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {student.email}{student.phone ? ` • ${student.phone}` : ""}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3.5 text-muted-foreground shrink-0" />
                            {student.email}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm font-mono">
                          {student.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3.5 text-muted-foreground shrink-0" />
                              {student.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            <BookOpen className="mr-1 size-3" />
                            {student.enrollments.length} Course{student.enrollments.length !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expanded enrollment list */}
                      {open && (
                        <TableRow key={`${student.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={5} className="bg-muted/20 pb-4 pt-0">
                            <div className="ml-8 mt-2 flex flex-col gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Enrolled Courses Details
                              </p>
                              {student.enrollments.map((e) => (
                                <div
                                  key={e.purchaseId}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="size-4 text-primary shrink-0" />
                                    <span className="font-semibold">{e.courseTitle}</span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      {e.amount > 0 ? formatPrice(e.amount) : "Free"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="size-3" />
                                      {new Date(e.purchasedAt).toLocaleDateString(undefined, {
                                        year: "numeric", month: "short", day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </InstructorShell>
  )
}
