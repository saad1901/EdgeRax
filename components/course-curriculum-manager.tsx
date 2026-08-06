"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Plus, PlayCircle, Trash2, Upload, Pencil, FileText, ExternalLink,
  Users, Gift, Calendar, IndianRupee, Check, X, Award,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { InstructorShell } from "@/components/instructor-shell"
import { GiveawayDialog } from "@/components/giveaway-dialog"
import { adminApi, type CourseStudent } from "@/lib/api"
import type { Course, Chapter, Lesson } from "@/lib/types"
import { toast } from "sonner"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function isUploadedVideo(videoUrl?: string | null) {
  return Boolean(videoUrl?.startsWith("wasabi:") || videoUrl?.startsWith("local:"))
}

export function CourseCurriculumManagerPage({
  params,
  mode = "admin",
}: {
  params: Promise<{ id: string }>
  mode?: "admin" | "instructor"
}) {
  const { id } = use(params)
  const Shell = mode === "instructor" ? InstructorShell : AdminShell
  const coursesPath = mode === "instructor" ? "/instructor/courses" : "/admin/courses"
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"curriculum" | "students">("curriculum")
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [giveawayOpen, setGiveawayOpen] = useState(false)
  const [togglingCerts, setTogglingCerts] = useState(false)

  async function toggleCertificates() {
    if (!course) return
    setTogglingCerts(true)
    try {
      await adminApi.updateCourse(course.id, { certificatesEnabled: !course.certificatesEnabled } as any)
      toast.success(course.certificatesEnabled ? "Certificates disabled." : "Certificates enabled — students can now claim them.")
      load()
    } catch { toast.error("Failed to update certificate setting.") }
    finally { setTogglingCerts(false) }
  }

  async function load() {
    try { setCourse(await adminApi.getCourse(id)) }
    catch { toast.error("Failed to load course.") }
    finally { setLoading(false) }
  }

  async function loadStudents() {
    setStudentsLoading(true)
    try { setStudents(await adminApi.listCourseStudents(id)) }
    catch { toast.error("Failed to load students.") }
    finally { setStudentsLoading(false) }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (tab === "students") loadStudents()
  }, [tab])

  if (loading) return <Shell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></Shell>
  if (!course) return (
    <Shell>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Course not found</EmptyTitle>
          <EmptyDescription>This course may have been deleted.</EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href={coursesPath} />}>Back to courses</Button>
      </Empty>
    </Shell>
  )

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" nativeButton={false} render={<Link href={coursesPath} />}>
            <ArrowLeft data-icon="inline-start" />Back to courses
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              <p className="text-muted-foreground">
                {course.students} student{course.students !== 1 ? "s" : ""} enrolled
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Certificate toggle */}
              <Button
                variant={course.certificatesEnabled ? "default" : "outline"}
                onClick={toggleCertificates}
                disabled={togglingCerts}
                className="gap-2"
              >
                {togglingCerts
                  ? <Spinner className="size-4" />
                  : <Award className="size-4" />}
                {course.certificatesEnabled ? "Certificates enabled" : "Enable certificates"}
              </Button>
              {tab === "curriculum" && <AddChapterDialog courseId={id} onAdded={load} />}
              {tab === "students" && (
                <Button onClick={() => setGiveawayOpen(true)} variant="outline">
                  <Gift data-icon="inline-start" />Grant free access
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          {(["curriculum", "students"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "students" ? (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />Students
                  {students.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{students.length}</Badge>
                  )}
                </span>
              ) : t}
            </button>
          ))}
        </div>

        {/* Curriculum tab */}
        {tab === "curriculum" && (
          course.chapters.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No chapters yet</EmptyTitle>
                <EmptyDescription>Add your first chapter to start building the curriculum.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {course.chapters.map((chapter, i) => (
                <ChapterCard key={chapter.id} chapter={chapter} index={i} courseId={id} onChanged={load} />
              ))}
            </div>
          )
        )}

        {/* Students tab */}
        {tab === "students" && (
          studentsLoading ? (
            <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
              <Users className="size-10 opacity-40" />
              <p className="font-medium">No students enrolled yet.</p>
              <Button variant="outline" onClick={() => setGiveawayOpen(true)}>
                <Gift data-icon="inline-start" />Grant free access to someone
              </Button>
            </div>
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Payment</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.purchaseId}>
                      <TableCell className="font-medium">
                        {s.name}
                        <p className="text-xs text-muted-foreground md:hidden">{s.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {s.email}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {s.paymentId === "giveaway" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Gift className="size-3" />Giveaway
                          </Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-32 block" title={s.paymentId}>
                            {s.paymentId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right font-medium">
                        {s.amount > 0 ? formatPrice(s.amount) : (
                          <span className="text-muted-foreground text-sm">Free</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {new Date(s.purchasedAt).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        )}
      </div>

      {/* Giveaway dialog — pre-selected course */}
      <GiveawayDialog
        courseId={course.id}
        courseName={course.title}
        open={giveawayOpen}
        onOpenChange={setGiveawayOpen}
        onGranted={() => { loadStudents(); load() }}
      />
    </Shell>
  )
}

export default function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseCurriculumManagerPage params={params} mode="admin" />
}

// ─── Add Chapter ─────────────────────────────────────────────────────────────

function AddChapterDialog({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) { toast.error("Enter a chapter title."); return }
    setSaving(true)
    try {
      await adminApi.addChapter(courseId, title.trim())
      toast.success("Chapter added.")
      setTitle("")
      setOpen(false)
      onAdded()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus data-icon="inline-start" />Add chapter</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add chapter</DialogTitle></DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ch-title">Chapter title</FieldLabel>
            <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Getting started" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}Add chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, index, courseId, onChanged }: {
  chapter: Chapter; index: number; courseId: string; onChanged: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(chapter.title)
  const [saving, setSaving] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete chapter "${chapter.title}" and all its lessons?`)) return
    setDeleting(true)
    try {
      await adminApi.deleteChapter(chapter.id)
      toast.success("Chapter deleted.")
      onChanged()
    } catch (e: any) { toast.error(e.message) }
    finally { setDeleting(false) }
  }

  function openEdit() {
    setEditTitle(chapter.title)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) { toast.error("Chapter title cannot be empty."); return }
    setSaving(true)
    try {
      await adminApi.updateChapter(chapter.id, editTitle.trim())
      toast.success("Chapter renamed.")
      setEditOpen(false)
      onChanged()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            Chapter {index + 1}: {chapter.title}
          </CardTitle>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit chapter name" onClick={openEdit}>
              <Pencil className="size-4" />
            </Button>
            <AddLessonDialog chapterId={chapter.id} onAdded={onChanged} />
            <Button variant="ghost" size="icon" aria-label="Delete chapter" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chapter.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {chapter.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onChanged={onChanged} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit chapter dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit chapter</DialogTitle></DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-ch-title">Chapter title</FieldLabel>
              <Input
                id="edit-ch-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                autoFocus
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Lesson Row ──────────────────────────────────────────────────────────────

function LessonRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lessonType = lesson.lessonType ?? "VIDEO"

  const hasVideo = Boolean(lesson.videoUrl)
  const isUploaded = isUploadedVideo(lesson.videoUrl)

  async function handleDelete() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return
    setDeleting(true)
    try {
      await adminApi.deleteLesson(lesson.id)
      toast.success("Lesson deleted.")
      onChanged()
    } catch (e: any) { toast.error(e.message) }
    finally { setDeleting(false) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadProgress(0)
    try {
      const isPdf = (lesson.lessonType ?? "VIDEO") === "PDF"
      if (isPdf) {
        await adminApi.uploadPdf(lesson.id, file, setUploadProgress)
        toast.success("PDF uploaded.")
      } else {
        await adminApi.uploadVideo(lesson.id, file, setUploadProgress)
        toast.success("Video uploaded.")
      }
      setUploadProgress(null)
      onChanged()
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.")
      setUploadProgress(null)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <>
      <li className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
        {lessonType === "PDF" ? (
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        ) : lessonType === "URL" ? (
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 min-w-0 leading-snug truncate">{lesson.title}</span>

        {lesson.preview && <Badge variant="secondary" className="shrink-0">Preview</Badge>}

        <Badge variant="outline" className="shrink-0 text-xs">
          {lessonType === "PDF" ? "PDF" : lessonType === "URL" ? "URL" : "Video"}
        </Badge>

        {lessonType === "VIDEO" ? (
          hasVideo ? (
            <Badge variant="outline" className="shrink-0 gap-1 text-xs">
              {isUploaded ? "Cloud upload" : "External"}
            </Badge>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">No video</span>
          )
        ) : lessonType === "PDF" ? (
          <span className="shrink-0 text-xs text-muted-foreground">{lesson.pdfTitle || "PDF lesson"}</span>
        ) : (
          <span className="shrink-0 max-w-[180px] truncate text-xs text-muted-foreground" title={lesson.urlLink || lesson.videoUrl || ""}>
            {lesson.urlLink || lesson.videoUrl || "URL lesson"}
          </span>
        )}

        <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration}</span>

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div className="flex w-full items-center gap-2 pl-7">
            <Progress value={uploadProgress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
          </div>
        )}

        <div className="flex shrink-0 gap-1">
          {/* Edit lesson button */}
          <Button variant="ghost" size="icon" aria-label="Edit lesson" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
          </Button>

          {lessonType !== "URL" && (
            <>
              <Button variant="ghost" size="icon" aria-label={lessonType === "PDF" ? "Upload PDF" : "Replace video"}
                onClick={() => fileRef.current?.click()} disabled={uploadProgress !== null}>
                <Upload className="size-4" />
              </Button>
              <input ref={fileRef} type="file" accept={lessonType === "PDF" ? "application/pdf" : "video/*"} className="hidden" onChange={handleFileChange} />
            </>
          )}

          <Button variant="ghost" size="icon" aria-label="Delete lesson" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
          </Button>
        </div>
      </li>

      {/* Edit lesson dialog */}
      <EditLessonDialog
        lesson={lesson}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onChanged}
        fileRef={fileRef}
        uploadProgress={uploadProgress}
        onFileChange={handleFileChange}
      />
    </>
  )
}

// ─── Edit Lesson Dialog ───────────────────────────────────────────────────────

function EditLessonDialog({
  lesson,
  open,
  onOpenChange,
  onSaved,
  fileRef,
  uploadProgress,
  onFileChange,
}: {
  lesson: Lesson
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  fileRef: React.RefObject<HTMLInputElement | null>
  uploadProgress: number | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [title, setTitle] = useState(lesson.title)
  const [duration, setDuration] = useState(lesson.duration)
  const [videoUrl, setVideoUrl] = useState(
    isUploadedVideo(lesson.videoUrl) ? "" : (lesson.videoUrl ?? "")
  )
  const [urlLink, setUrlLink] = useState(lesson.urlLink ?? "")
  const [lessonType, setLessonType] = useState<"VIDEO" | "PDF" | "URL">(lesson.lessonType ?? "VIDEO")
  const [pdfTitle, setPdfTitle] = useState(lesson.pdfTitle ?? "")
  const [pdfDescription, setPdfDescription] = useState(lesson.pdfDescription ?? "")
  const [preview, setPreview] = useState(lesson.preview)
  const [saving, setSaving] = useState(false)

  // Reset to fresh lesson data whenever dialog opens
  useEffect(() => {
    if (open) {
      setTitle(lesson.title)
      setDuration(lesson.duration)
      setVideoUrl(isUploadedVideo(lesson.videoUrl) ? "" : (lesson.videoUrl ?? ""))
      setUrlLink(lesson.urlLink ?? "")
      setLessonType(lesson.lessonType ?? "VIDEO")
      setPdfTitle(lesson.pdfTitle ?? "")
      setPdfDescription(lesson.pdfDescription ?? "")
      setPreview(lesson.preview)
    }
  }, [open, lesson])

  const isUploaded = isUploadedVideo(lesson.videoUrl)
  const hasVideo = Boolean(lesson.videoUrl)

  async function handleSave() {
    if (!title.trim()) { toast.error("Lesson title cannot be empty."); return }
    if (lessonType === "URL" && !urlLink.trim()) { toast.error("Enter a URL for this lesson."); return }
    setSaving(true)
    try {
      await adminApi.updateLesson(lesson.id, {
        title: title.trim(),
        duration: duration.trim(),
        preview,
        lessonType,
        pdfTitle: pdfTitle.trim(),
        pdfDescription: pdfDescription.trim(),
        urlLink: urlLink.trim(),
        // Only send videoUrl if it is external; uploaded videos are set by the upload route.
        ...(lessonType === "VIDEO" && videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
      })
      toast.success("Lesson updated.")
      onOpenChange(false)
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="el-title">Lesson title</FieldLabel>
            <Input
              id="el-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="el-duration">Duration</FieldLabel>
              <Input
                id="el-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="8:30"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="el-preview" className="mb-2 block">Free preview</FieldLabel>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="el-preview"
                  type="checkbox"
                  checked={preview}
                  onChange={(e) => setPreview(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <label htmlFor="el-preview" className="text-sm">Visible without purchase</label>
              </div>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="el-lesson-type">Lesson type</FieldLabel>
            <select id="el-lesson-type" value={lessonType} onChange={(e) => setLessonType(e.target.value as "VIDEO" | "PDF" | "URL")}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="VIDEO">Video</option>
              <option value="PDF">PDF</option>
              <option value="URL">URL only</option>
            </select>
          </Field>

          {lessonType === "VIDEO" ? (
            <Field>
              <FieldLabel>Video</FieldLabel>
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  {hasVideo ? (
                    isUploaded ? (
                      <Badge variant="outline" className="gap-1">Cloud video uploaded</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 max-w-full">
                        <span className="truncate max-w-[220px]" title={lesson.videoUrl}>🔗 {lesson.videoUrl}</span>
                      </Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs">No video set</span>
                  )}
                </div>

                <Field>
                  <FieldLabel htmlFor="el-video-url" className="text-xs text-muted-foreground">
                    External URL (YouTube, Vimeo, direct .mp4, etc.)
                  </FieldLabel>
                  <Input
                    id="el-video-url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                  {isUploaded && videoUrl.trim() && (
                    <p className="text-xs text-amber-600 mt-1">
                      Setting an external URL will replace the uploaded cloud video.
                    </p>
                  )}
                </Field>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {isUploaded ? "Replace cloud video file" : "Or upload a video file to Wasabi"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadProgress !== null}
                    >
                      <Upload className="size-3.5" />
                      {uploadProgress !== null ? `Uploading ${uploadProgress}%…` : isUploaded ? "Replace file" : "Upload file"}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        onFileChange(e)
                      }}
                    />
                  </div>
                  {uploadProgress !== null && (
                    <div className="flex items-center gap-2">
                      <Progress value={uploadProgress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Field>
          ) : lessonType === "PDF" ? (
            <Field>
              <FieldLabel>PDF lesson</FieldLabel>
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                <Field>
                  <FieldLabel htmlFor="el-pdf-title" className="text-xs text-muted-foreground">PDF title</FieldLabel>
                  <Input id="el-pdf-title" value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} placeholder="Module 1 notes" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="el-pdf-description" className="text-xs text-muted-foreground">Description (optional)</FieldLabel>
                  <textarea id="el-pdf-description" value={pdfDescription} onChange={(e) => setPdfDescription(e.target.value)}
                    className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional summary" />
                </Field>
              </div>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="el-url-link">URL Link</FieldLabel>
              <Input
                id="el-url-link"
                value={urlLink}
                onChange={(e) => setUrlLink(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the full URL that students will visit to access this lesson.</p>
            </Field>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploadProgress !== null}>
            {saving && <Spinner data-icon="inline-start" />}Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Lesson ──────────────────────────────────────────────────────────────

function AddLessonDialog({ chapterId, onAdded }: { chapterId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [urlLink, setUrlLink] = useState("")
  const [lessonType, setLessonType] = useState<"VIDEO" | "PDF" | "URL">("VIDEO")
  const [pdfTitle, setPdfTitle] = useState("")
  const [pdfDescription, setPdfDescription] = useState("")
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) { toast.error("Enter a lesson title."); return }
    if (lessonType === "URL" && !urlLink.trim()) { toast.error("Enter a URL for this lesson."); return }
    setSaving(true)
    try {
      await adminApi.addLesson(chapterId, {
        title: title.trim(),
        duration: duration.trim() || "5:00",
        preview,
        lessonType,
        videoUrl: videoUrl.trim(),
        pdfTitle: pdfTitle.trim(),
        pdfDescription: pdfDescription.trim(),
        urlLink: urlLink.trim(),
      })
      toast.success("Lesson added.")
      setTitle(""); setDuration(""); setVideoUrl(""); setUrlLink(""); setPdfTitle(""); setPdfDescription(""); setLessonType("VIDEO"); setPreview(false)
      setOpen(false)
      onAdded()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Plus data-icon="inline-start" />Add lesson</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add lesson</DialogTitle></DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="l-title">Lesson title</FieldLabel>
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="l-duration">Duration</FieldLabel>
              <Input id="l-duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="8:30" />
            </Field>
            <Field>
              <FieldLabel htmlFor="l-lesson-type">Lesson type</FieldLabel>
              <select id="l-lesson-type" value={lessonType} onChange={(e) => setLessonType(e.target.value as "VIDEO" | "PDF" | "URL")}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="VIDEO">Video</option>
                <option value="PDF">PDF</option>
                <option value="URL">URL only</option>
              </select>
            </Field>
          </div>
          {lessonType === "VIDEO" ? (
            <Field>
              <FieldLabel htmlFor="l-video">Video URL (optional)</FieldLabel>
              <Input id="l-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..." />
            </Field>
          ) : lessonType === "PDF" ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
              <Field>
                <FieldLabel htmlFor="l-pdf-title">PDF title</FieldLabel>
                <Input id="l-pdf-title" value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} placeholder="Module 1 notes" />
              </Field>
              <Field>
                <FieldLabel htmlFor="l-pdf-description">Description (optional)</FieldLabel>
                <textarea id="l-pdf-description" value={pdfDescription} onChange={(e) => setPdfDescription(e.target.value)}
                  className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Optional summary" />
              </Field>
            </div>
          ) : (
            <Field>
              <FieldLabel htmlFor="l-url-link">URL Link</FieldLabel>
              <Input
                id="l-url-link"
                value={urlLink}
                onChange={(e) => setUrlLink(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the full URL that students will visit to access this lesson.</p>
            </Field>
          )}
          <Field orientation="horizontal" className="flex items-center gap-2">
            <input id="l-preview" type="checkbox" checked={preview}
              onChange={(e) => setPreview(e.target.checked)} className="size-4 accent-primary" />
            <FieldLabel htmlFor="l-preview" className="font-normal">Free preview lesson</FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}Add lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
