"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Plus, Pencil, Trash2, ListTree } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { InstructorShell } from "@/components/instructor-shell"
import { CourseFormDialog } from "@/components/course-form-dialog"
import { adminApi } from "@/lib/api"
import type { Course } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function CoursesManagerPage({ mode = "admin" }: { mode?: "admin" | "instructor" }) {
  const Shell = mode === "instructor" ? InstructorShell : AdminShell
  const basePath = mode === "instructor" ? "/instructor/courses" : "/admin/courses"
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState<Course | null>(null)
  const [deleting, setDeleting] = useState<Course | null>(null)

  async function load() {
    try { setCourses(await adminApi.listCourses()) }
    catch { toast.error("Failed to load courses.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(c: Course) { setEditing(c); setFormOpen(true) }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await adminApi.deleteCourse(deleting.id)
      toast.success(`Deleted "${deleting.title}".`)
      setDeleting(null)
      load()
    } catch { toast.error("Failed to delete course.") }
  }

  function lessonCount(c: Course) { return c.chapters?.reduce((s, ch) => s + (ch.lessons?.length ?? 0), 0) ?? 0 }

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
            <p className="text-muted-foreground">{mode === "instructor" ? "Manage the courses assigned to you." : "Manage your course catalog."}</p>
          </div>
          <Button onClick={openCreate}><Plus data-icon="inline-start" />New course</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Lessons</TableHead>
                  <TableHead className="hidden lg:table-cell">Sales</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image src={course.thumbnail || "/placeholder.svg"} alt=""
                          width={56} height={36}
                          className="hidden h-9 w-14 rounded object-cover sm:block" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{course.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{course.instructor}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">{course.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {lessonCount(course)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {course.students}
                    </TableCell>
                    <TableCell className="font-medium">{formatPrice(course.price)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Manage curriculum"
                          nativeButton={false} render={<Link href={`${basePath}/${course.id}`} />}>
                          <ListTree />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(course)}>
                          <Pencil />
                        </Button>
                        {mode === "admin" && (
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(course)}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} course={editing} onSaved={load} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{deleting?.title}&quot; and all related enrollment records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  )
}

// Named export only — used by both admin and instructor pages
