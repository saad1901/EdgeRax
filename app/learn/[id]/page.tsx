"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  PlayCircle,
  FileText,
  Award,
  Download,
  Lock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Check,
} from "lucide-react"
import { useSession } from "@/lib/session"
import { coursesApi, progressApi, purchasesApi } from "@/lib/api"
import type { Course, Lesson, Chapter } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { resolveVideoUrl } from "@/lib/video"

interface Certificate {
  id:                string
  userId:            string
  courseId:          string
  certificateName:   string
  certificateNumber: string
  issuedAt:          string
  pdfPath:           string
}

function CertificateSection({ courseId, progress }: { courseId: string; progress: number }) {
  const [cert, setCert]           = useState<Certificate | null | undefined>(undefined)
  const [nameInput, setNameInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isUnlocked = progress >= 80

  useEffect(() => {
    fetch(`/api/certificates?courseId=${encodeURIComponent(courseId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCert(data ?? null))
      .catch(() => setCert(null))
  }, [courseId])

  async function handleSubmitName() {
    if (!nameInput.trim()) { toast.error("Please enter your name."); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/certificates", {
        method:  "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, certificateName: nameInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to generate certificate."); return }
      setCert(data)
      toast.success("Certificate generated successfully!")
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload() {
    if (!cert) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/certificates/${cert.id}/download`, { credentials: "include" })
      if (!res.ok) { toast.error("Download failed. Please try again."); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `certificate-${cert.certificateNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed.")
    } finally {
      setDownloading(false)
    }
  }

  if (cert === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-xs">
        <Spinner className="size-4" /> Checking certificate status…
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border bg-card shadow-xs overflow-hidden transition-all",
      !isUnlocked && "opacity-90",
    )}>
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3.5">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full shadow-xs",
          cert ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
               : isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {cert ? <Award className="size-5" /> : isUnlocked ? <Award className="size-5" /> : <Lock className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug">Certificate of Completion</p>
          <p className="text-xs text-muted-foreground">
            {cert
              ? `Issued · ${cert.certificateNumber}`
              : isUnlocked
                ? "You've unlocked your official certificate"
                : `Complete at least 80% to unlock · ${progress}% done`}
          </p>
        </div>
        {!isUnlocked && (
          <Badge variant="outline" className="shrink-0 font-mono text-xs">
            {progress}% / 80%
          </Badge>
        )}
      </div>

      <div className="p-5">
        {!isUnlocked && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Lock className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-base">Keep Going! You&apos;re Almost There</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Complete {Math.max(0, 80 - progress)}% more of this course to claim your verified certificate of completion.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={progress} className="h-2.5" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{progress}% completed</span>
                <span>80% required</span>
              </div>
            </div>
          </div>
        )}

        {isUnlocked && !cert && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Important:</strong> The name you enter below will be printed on your official certificate and{" "}
                <strong>cannot be changed</strong> once generated.
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="cert-name" className="text-xs font-semibold text-foreground">
                Full Name for Certificate
              </label>
              <div className="flex gap-2">
                <Input
                  id="cert-name"
                  placeholder="Enter your full legal name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmitName()}
                  className="flex-1"
                  disabled={submitting}
                  maxLength={100}
                />
                <Button onClick={handleSubmitName} disabled={submitting || !nameInput.trim()}>
                  {submitting ? <Spinner data-icon="inline-start" /> : <Award data-icon="inline-start" />}
                  {submitting ? "Generating…" : "Generate Certificate"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {cert && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3.5 text-xs sm:grid-cols-4">
              <div>
                <p className="font-medium text-muted-foreground">Name on Certificate</p>
                <p className="mt-0.5 font-semibold text-foreground">{cert.certificateName}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Certificate ID</p>
                <p className="mt-0.5 font-mono font-semibold text-foreground">{cert.certificateNumber}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Issued On</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Issued By</p>
                <p className="mt-0.5 font-semibold text-foreground">Edgerax</p>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto self-start gap-2">
              {downloading
                ? <><Spinner className="size-4" /> Downloading…</>
                : <><Download className="size-4" /> Download Certificate (PDF)</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface FlatLesson { chapterTitle: string; lesson: Lesson; chapterIndex: number; lessonIndex: number; globalIndex: number }

function PdfArea({ lesson }: { lesson: Lesson | null }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!lesson?.pdfPath) return
    setDownloading(true)
    try {
      const res = await fetch(lesson.pdfPath, { credentials: "include" })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = (lesson.pdfTitle || lesson.title || "lesson") + ".pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently ignore — user will see nothing happened and can retry
    } finally {
      setDownloading(false)
    }
  }

  if (!lesson || lesson.lessonType !== "PDF") return null

  if (!lesson.pdfPath) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
        <FileText className="size-10 text-muted-foreground/40 mb-3" />
        <p className="font-semibold text-sm text-foreground">No document attached</p>
        <p className="text-xs text-muted-foreground mt-1">The study material for this lesson hasn't been uploaded yet.</p>
      </div>
    )
  }

  const title = lesson.pdfTitle || lesson.title || "Lesson Document"
  const description = lesson.pdfDescription?.trim()

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
      {/* Red accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-8">
        <div className="flex items-start gap-5">
          {/* PDF icon badge */}
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-3.5 dark:border-red-900/40 dark:bg-red-950/30">
            <FileText className="size-7 text-red-500 dark:text-red-400" />
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-red-400">PDF</span>
          </div>

          {/* Text content */}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base sm:text-lg text-foreground leading-snug truncate">{title}</p>
            {description ? (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">{description}</p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Course study material — download to read offline on any device.
              </p>
            )}

            <p className="mt-3 text-xs font-medium text-muted-foreground">PDF Document</p>
          </div>
        </div>

        {/* Divider + action */}
        <div className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-end border-t bg-card/95 px-4 pt-4 backdrop-blur sm:-mx-8 sm:px-8 sm:pt-5">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full shrink-0 gap-2 bg-red-500 text-white shadow-sm hover:bg-red-600 sm:w-auto dark:bg-red-600 dark:hover:bg-red-700"
          >
            {downloading
              ? <><Spinner data-icon="inline-start" /> Downloading…</>
              : <><Download data-icon="inline-start" /> Download PDF</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LinkArea({ lesson }: { lesson: Lesson | null }) {
  if (!lesson || lesson.lessonType !== "URL") return null

  const raw = (lesson.urlLink || lesson.videoUrl || "").trim()
  const url = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw

  // Try to extract a readable hostname for display
  let hostname = ""
  try { hostname = new URL(url).hostname.replace(/^www\./, "") } catch { /* ignore */ }

  if (!url) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
        <ExternalLink className="size-10 text-muted-foreground/40 mb-3" />
        <p className="font-semibold text-sm text-foreground">No link attached</p>
        <p className="text-xs text-muted-foreground mt-1">No external resource was provided for this lesson.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
      {/* Blue accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-8">
        <div className="flex items-start gap-5">
          {/* Link icon badge */}
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-3.5 dark:border-blue-900/40 dark:bg-blue-950/30">
            <ExternalLink className="size-7 text-blue-500 dark:text-blue-400" />
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400">Link</span>
          </div>

          {/* Text content */}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base sm:text-lg text-foreground leading-snug truncate">{lesson.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              External resource for this lesson. Opens in a new tab.
            </p>

            {hostname && <p className="mt-3 truncate text-xs font-medium text-muted-foreground">{hostname}</p>}
          </div>
        </div>

        {/* Divider + action */}
        <div className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-end border-t bg-card/95 px-4 pt-4 backdrop-blur sm:-mx-8 sm:px-8 sm:pt-5">
          <Button
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
            className="w-full shrink-0 gap-2 bg-blue-500 text-white shadow-sm hover:bg-blue-600 sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Open Link <ExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function VideoArea({
  lesson,
  lessonId,
  onEnded,
}: {
  lesson: Lesson | null
  lessonId: string | null
  onEnded?: () => void
}) {
  const [videoError, setVideoError] = useState(false)
  const [errorMsg, setErrorMsg]     = useState("")

  useEffect(() => { setVideoError(false); setErrorMsg("") }, [lessonId])

  if (!lesson || !lessonId || lesson.lessonType === "PDF" || lesson.lessonType === "URL") return null

  const source = resolveVideoUrl(lesson.videoUrl ?? "", lessonId)
  const isOwnVideo = source.type === "local" || source.type === "video"

  return (
    <div className="w-full overflow-hidden bg-black shadow-xl">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {source.type === "iframe" && (
          <iframe
            key={source.src}
            src={source.src}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        )}

        {isOwnVideo && !videoError && (
          <video
            key={source.src}
            src={source.src}
            controls
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onEnded={onEnded}
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload"
            onError={(e) => {
              const vid = e.currentTarget as HTMLVideoElement
              const code = vid.error?.code
              const msg  = vid.error?.message ?? ""
              setErrorMsg(`Video playback error (${code ?? "?"}: ${msg || "unknown format"})`)
              setVideoError(true)
            }}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "contain", background: "#000",
            }}
          />
        )}

        {isOwnVideo && videoError && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-3 bg-black/95 px-6 text-center text-white"
          >
            <PlayCircle className="size-12 opacity-50" />
            <p className="text-sm font-medium">Video player encountered an error</p>
            <p className="max-w-xs text-xs opacity-60 break-all">{errorMsg}</p>
            <button
              onClick={() => { setVideoError(false); setErrorMsg("") }}
              className="mt-2 rounded-md bg-white/10 px-4 py-1.5 text-xs hover:bg-white/20 transition-colors"
            >
              Try Reloading
            </button>
          </div>
        )}

        {source.type === "open" && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
          >
            <PlayCircle className="size-14 opacity-70" />
            <p className="text-sm opacity-80">This video source requires opening directly in browser.</p>
            <a
              href={source.src}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Open Video Stream
            </a>
          </div>
        )}

        {source.type === "empty" && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-3 bg-black text-white"
          >
            <PlayCircle className="size-16 opacity-40" />
            <p className="px-4 text-center text-sm opacity-60">No video attached to this lesson.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LessonTypeIcon({ lessonType, className }: { lessonType?: Lesson["lessonType"]; className?: string }) {
  switch (lessonType) {
    case "PDF":
      return <FileText className={className} />
    case "URL":
      return <ExternalLink className={className} />
    case "VIDEO":
    default:
      return <PlayCircle className={className} />
  }
}

function ChapterAccordion({
  chapter,
  chapterIndex,
  activeId,
  completed,
  owned,
  onSelect,
  isOpen,
  onToggle,
}: {
  chapter: Chapter
  chapterIndex: number
  activeId: string | null
  completed: Set<string>
  owned: boolean
  onSelect: (l: Lesson) => void
  isOpen: boolean
  onToggle: () => void
}) {
  const completedCount = chapter.lessons.filter((l) => completed.has(l.id)).length
  const totalCount = chapter.lessons.length
  const chapterProgress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0
  const hasActive = chapter.lessons.some((l) => l.id === activeId)

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          hasActive && "bg-muted/30 font-medium"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Module {chapterIndex + 1}
            </span>
            <span className="text-[11px] text-muted-foreground">· {completedCount}/{totalCount} done</span>
          </div>
          <p className="truncate text-xs sm:text-sm font-semibold text-foreground mt-0.5">{chapter.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalCount > 0 && (
            <div className="hidden sm:block w-12 bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full transition-all" style={{ width: `${chapterProgress}%` }} />
            </div>
          )}
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
          />
        </div>
      </button>

      {isOpen && (
        <div className="bg-muted/10 pb-1">
          {chapter.lessons.map((l) => {
            const isActive = l.id === activeId
            const isDone = completed.has(l.id)
            const isLocked = !owned && !l.preview
            return (
              <button
                key={l.id}
                onClick={() => !isLocked && onSelect(l)}
                disabled={isLocked}
                className={cn(
                  "group flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs sm:text-sm transition-all relative",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-3"
                    : isLocked
                    ? "cursor-not-allowed opacity-50 hover:bg-transparent"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative flex size-5 shrink-0 items-center justify-center">
                  {isDone ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  ) : isLocked ? (
                    <Lock className="size-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <LessonTypeIcon
                      lessonType={l.lessonType}
                      className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn("truncate leading-snug", isActive && "text-primary")}>
                    {l.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{l.lessonType === "PDF" ? "PDF" : l.lessonType === "URL" ? "URL" : "Video"}</span>
                    {l.duration && <span>· {l.duration}</span>}
                    {l.preview && !owned && (
                      <Badge variant="secondary" className="px-1 py-0 text-[9px] h-4">Free Preview</Badge>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, ready } = useSession()

  const [course, setCourse]                   = useState<Course | null>(null)
  const [completedIds, setCompleted]          = useState<Set<string>>(new Set())
  const [progressReady, setProgressReady]     = useState(false)
  const [ownershipReady, setOwnershipReady]   = useState(false)
  const [activeId, setActiveId]               = useState<string | null>(null)
  const [loadingCourse, setLoadingCourse]     = useState(true)
  const [marking, setMarking]                 = useState(false)
  const [owned, setOwned]                     = useState(false)
  const [autoAdvance, setAutoAdvance]         = useState(true)
  const [openChapters, setOpenChapters]       = useState<Record<string, boolean>>({})

  // Load course
  useEffect(() => {
    coursesApi.get(params.id).then(setCourse).catch(() => setCourse(null)).finally(() => setLoadingCourse(false))
  }, [params.id])

  // Load progress
  useEffect(() => {
    if (!ready) return
    if (!user || !params.id) {
      // Not logged in — no progress to load, mark as ready so lesson selection proceeds
      setProgressReady(true)
      return
    }
    progressApi.get(params.id)
      .then((ids) => setCompleted(new Set(ids)))
      .catch(() => {})
      .finally(() => setProgressReady(true))
  }, [user, ready, params.id])

  // Access control check
  useEffect(() => {
    if (!ready) return
    if (!course) return

    const hasPreview = course.chapters.some((ch) => ch.lessons.some((l) => l.preview))

    if (!user) {
      if (!hasPreview) {
        router.push(`/auth?redirect=/learn/${params.id}`)
      }
      // Not logged in — ownership resolved (false), unblock lesson selection
      setOwnershipReady(true)
      return
    }

    purchasesApi.list().then((ps) => {
      const purchase = ps.find((p) => p.courseId === params.id)
      if (!purchase) {
        if (!hasPreview) {
          router.push(`/courses/${params.id}`)
        }
        setOwnershipReady(true)
        return
      }
      if (purchase.expiresAt && new Date(purchase.expiresAt) <= new Date()) {
        router.push(`/courses/${params.id}?expired=1`)
        setOwnershipReady(true)
        return
      }
      setOwned(true)
      setOwnershipReady(true)
    }).catch(() => { setOwnershipReady(true) })
  }, [ready, user, course, params.id, router])

  // Flatten lessons for linear navigation
  const flat: FlatLesson[] = useMemo(() => {
    if (!course) return []
    let flatIndex = 0
    return course.chapters.flatMap((ch, chIdx) =>
      ch.lessons.map((lesson, lIdx) => ({
        chapterTitle: ch.title,
        lesson,
        chapterIndex: chIdx,
        lessonIndex: lIdx,
        globalIndex: flatIndex++,
      }))
    )
  }, [course])

  // Save active lesson ID to localStorage whenever student switches lessons
  useEffect(() => {
    if (activeId && params.id) {
      try {
        localStorage.setItem(`last_lesson_${params.id}`, activeId)
      } catch { /* ignore */ }
    }
  }, [activeId, params.id])

  // Auto-restore last watched lesson or resume uncompleted lesson.
  // Wait for BOTH progress and ownership to be resolved before selecting —
  // otherwise we pick a lesson before knowing which are completed or whether
  // the user is an owner, then activeId is set and the effect never re-runs.
  useEffect(() => {
    if (!flat.length || !progressReady || !ownershipReady || activeId) return

    // 1. Explicit URL parameter ?lesson=
    const requestedId = searchParams.get("lesson")
    const requestedLesson = requestedId ? flat.find((f) => f.lesson.id === requestedId) : null

    // 2. Last watched lesson stored in student's localStorage
    let savedLesson = null
    if (typeof window !== "undefined" && params.id) {
      try {
        const savedId = localStorage.getItem(`last_lesson_${params.id}`)
        if (savedId) {
          savedLesson = flat.find((f) => f.lesson.id === savedId) ?? null
        }
      } catch { /* ignore */ }
    }

    // 3. First uncompleted lesson fallback
    const firstUncompleted = flat.find((f) => !completedIds.has(f.lesson.id))?.lesson

    // Selection priority:
    // - Explicit ?lesson= URL param wins
    // - Then last saved lesson — but only if it hasn't been completed yet
    // - Then first uncompleted lesson (the core "resume" behaviour)
    // - Then very first lesson if everything is complete
    const resumeLesson = savedLesson && !completedIds.has(savedLesson.lesson.id)
      ? savedLesson.lesson
      : firstUncompleted

    const defaultLesson = owned
      ? (resumeLesson ?? flat[0].lesson)
      : (flat.find((f) => f.lesson.preview)?.lesson ?? flat[0].lesson)

    setActiveId(requestedLesson?.lesson.id ?? defaultLesson.id)
  }, [flat, activeId, owned, progressReady, ownershipReady, searchParams, params.id, completedIds])

  // Automatically expand chapter containing the active lesson
  useEffect(() => {
    if (!activeId || !course) return
    const activeChapter = course.chapters.find((ch) =>
      ch.lessons.some((l) => l.id === activeId)
    )
    if (activeChapter) {
      setOpenChapters((prev) => ({ ...prev, [activeChapter.id]: true }))
    }
  }, [activeId, course])

  const toggleChapter = (chId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chId]: !prev[chId] }))
  }

  const activeLessonIndex = useMemo(() => {
    return flat.findIndex((f) => f.lesson.id === activeId)
  }, [flat, activeId])

  const activeLessonObj = activeLessonIndex >= 0 ? flat[activeLessonIndex] : null
  const activeLesson    = activeLessonObj?.lesson ?? null

  const prevLessonObj = activeLessonIndex > 0 ? flat[activeLessonIndex - 1] : null
  const nextLessonObj = activeLessonIndex >= 0 && activeLessonIndex < flat.length - 1 ? flat[activeLessonIndex + 1] : null

  const progress = flat.length ? Math.round((completedIds.size / flat.length) * 100) : 0
  const canViewActive = owned || Boolean(activeLesson?.preview)

  const goToPrev = useCallback(() => {
    if (prevLessonObj) {
      const isLocked = !owned && !prevLessonObj.lesson.preview
      if (!isLocked) {
        setActiveId(prevLessonObj.lesson.id)
      } else {
        toast.error("Previous lesson is locked.")
      }
    }
  }, [prevLessonObj, owned])

  const goToNext = useCallback(() => {
    if (nextLessonObj) {
      const isLocked = !owned && !nextLessonObj.lesson.preview
      if (!isLocked) {
        setActiveId(nextLessonObj.lesson.id)
      } else {
        toast.error("Next lesson is locked.")
      }
    }
  }, [nextLessonObj, owned])

  const markAndNext = useCallback(async () => {
    if (!activeLesson || marking || !owned) return
    setMarking(true)
    try {
      await progressApi.mark(activeLesson.id)
      setCompleted((prev) => new Set(prev).add(activeLesson.id))
      toast.success("Lesson completed!")
      if (nextLessonObj) {
        const isLocked = !owned && !nextLessonObj.lesson.preview
        if (!isLocked) {
          setActiveId(nextLessonObj.lesson.id)
        }
      }
    } catch {
      toast.error("Could not update progress.")
    } finally {
      setMarking(false)
    }
  }, [activeLesson, marking, owned, nextLessonObj])

  const handleVideoEnded = useCallback(() => {
    if (autoAdvance && activeLesson && owned) {
      markAndNext()
    }
  }, [autoAdvance, activeLesson, owned, markAndNext])

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        if (activeLesson && owned) {
          markAndNext()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrev, goToNext, markAndNext, activeLesson, owned])

  if (loadingCourse || !ready) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading lecture environment…</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Course not found</p>
        <Button nativeButton={false} render={<Link href="/" />}>Back home</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background selection:bg-primary/20">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md shadow-2xs">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          {/* Left: Back & Course info */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={`/courses/${course.id}`} />}
              className="shrink-0"
              title="Return to course details"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Image src="/logo.png" alt="Edgerax" width={26} height={26} className="rounded-md bg-black p-1 shrink-0" />
            <div className="min-w-0 hidden sm:block">
              <p className="truncate text-xs font-semibold text-foreground leading-none">{course.title}</p>
              {activeLessonObj && (
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                  Lesson {activeLessonIndex + 1} of {flat.length} · {activeLessonObj.chapterTitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Auto-next & Progress */}
          <div className="flex items-center gap-3">
            {/* Auto advance toggle */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                id="auto-advance"
                checked={autoAdvance}
                onCheckedChange={setAutoAdvance}
                className="scale-75"
              />
              <label htmlFor="auto-advance" className="cursor-pointer font-medium select-none text-xs">
                Auto-next
              </label>
            </div>

            {/* Overall Progress */}
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-16 sm:w-24 h-2" />
              <span className="text-xs font-mono font-semibold text-muted-foreground">{progress}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Viewport Layout ── */}
      <div className="flex flex-1 flex-col lg:flex-row min-w-0">

        {/* ── Left Content Column ── */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Media Player Area — sticky on mobile so video stays fixed while content scrolls */}
          <div className="sticky top-14 z-30 w-full bg-black lg:relative lg:top-auto lg:z-auto">
            <div className="w-full">
              {!canViewActive ? (
                <div className="flex min-h-[350px] sm:min-h-[460px] flex-col items-center justify-center gap-4 bg-muted/20 p-8 text-center border-b border-border/60">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="size-7 text-muted-foreground" />
                  </div>
                  <div className="max-w-sm">
                    <p className="font-bold text-lg text-foreground">This lesson is locked</p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                      Enroll in this course to unlock all video lectures, PDF notes, and certificate.
                    </p>
                  </div>
                  <Button nativeButton={false} render={<Link href={`/courses/${course.id}`} />} className="gap-2 font-semibold">
                    Enroll Now &amp; Unlock
                  </Button>
                </div>
              ) : activeLesson?.lessonType === "PDF" ? (
                <div className="w-full bg-black flex items-center justify-center">
                  <div className="w-full max-w-[1440px] mx-auto aspect-video">
                    <PdfArea lesson={activeLesson} />
                  </div>
                </div>
              ) : activeLesson?.lessonType === "URL" ? (
                <div className="w-full bg-black flex items-center justify-center">
                  <div className="w-full max-w-[1440px] mx-auto aspect-video">
                    <LinkArea lesson={activeLesson} />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-black flex items-center justify-center">
                  <div className="w-full max-w-[1440px] mx-auto">
                    <VideoArea lesson={activeLesson} lessonId={activeId} onEnded={handleVideoEnded} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Dedicated Navigation & Controls Bar ── */}
          <div className="border-b bg-card px-3 sm:px-6 py-2.5 shadow-xs overflow-x-auto">
            <div className="max-w-[1440px] mx-auto flex flex-nowrap items-center justify-between gap-2 sm:gap-4 w-full min-w-0">

              {/* Prev Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                disabled={!prevLessonObj}
                className="gap-1 sm:gap-2 text-xs font-semibold h-9 px-2 sm:px-3 shrink-0 whitespace-nowrap"
              >
                <ChevronLeft className="size-4 shrink-0" />
                <span>Prev</span>
              </Button>

              {/* Main Center Action: Mark Complete & Next */}
              {owned && activeLesson && (
                <Button
                  onClick={markAndNext}
                  disabled={marking}
                  size="sm"
                  className={cn(
                    "gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm h-9 px-3 sm:px-5 shadow-sm transition-all shrink-0 whitespace-nowrap",
                    completedIds.has(activeLesson.id)
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {marking ? (
                    <Spinner className="size-4 shrink-0" />
                  ) : completedIds.has(activeLesson.id) ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <Check className="size-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {completedIds.has(activeLesson.id)
                      ? nextLessonObj ? "Completed · Next →" : "Completed ✓"
                      : nextLessonObj ? "Mark Complete & Next" : "Mark Complete"}
                  </span>
                  <span className="sm:hidden">
                    {completedIds.has(activeLesson.id)
                      ? "Completed"
                      : nextLessonObj ? "Complete & Next" : "Complete"}
                  </span>
                </Button>
              )}

              {/* Next Button */}
              <Button
                variant={nextLessonObj ? "default" : "outline"}
                size="sm"
                onClick={goToNext}
                disabled={!nextLessonObj}
                className="gap-1 sm:gap-2 text-xs font-semibold h-9 px-2 sm:px-3 shrink-0 whitespace-nowrap"
              >
                <span className="hidden sm:inline">Next Lesson</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="size-4 shrink-0" />
              </Button>

            </div>
          </div>

          {/* ── Details Area Below Video Player ── */}
          <div className="flex-1 p-4 lg:p-6 max-w-5xl w-full mx-auto">
            {/* Mobile View: Curriculum & Certificate Tabs */}
            <div className="lg:hidden">
              <Tabs defaultValue="curriculum" className="w-full">
                <TabsList className="mb-6 grid w-full max-w-xs grid-cols-2">
                  <TabsTrigger value="curriculum" className="gap-1.5 text-xs font-semibold">
                    <Layers className="size-3.5" /> Curriculum
                  </TabsTrigger>
                  <TabsTrigger value="certificate" className="gap-1.5 text-xs font-semibold">
                    <Award className="size-3.5" /> Certificate
                  </TabsTrigger>
                </TabsList>

                {/* Curriculum Tab Content (Mobile) */}
                <TabsContent value="curriculum" className="space-y-4">
                  <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                      <p className="font-semibold text-sm">Course Structure &amp; Modules</p>
                      <span className="text-xs text-muted-foreground">{completedIds.size} of {flat.length} completed</span>
                    </div>
                    <div className="divide-y">
                      {course.chapters.map((ch, idx) => (
                        <ChapterAccordion
                          key={ch.id}
                          chapter={ch}
                          chapterIndex={idx}
                          activeId={activeId}
                          completed={completedIds}
                          owned={owned}
                          onSelect={(l) => setActiveId(l.id)}
                          isOpen={Boolean(openChapters[ch.id])}
                          onToggle={() => toggleChapter(ch.id)}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Certificate Tab Content (Mobile) */}
                <TabsContent value="certificate">
                  {owned && course.certificatesEnabled ? (
                    <CertificateSection courseId={params.id} progress={progress} />
                  ) : (
                    <div className="rounded-xl border p-6 text-center bg-card">
                      <Award className="size-10 mx-auto text-muted-foreground/60" />
                      <p className="font-semibold mt-3 text-sm sm:text-base">
                        Certificates will be enabled once the course completes.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Complete your lessons to earn your official certificate of completion.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop View: Certificate Section Below Player */}
            <div className="hidden lg:block">
              {owned && course.certificatesEnabled ? (
                <CertificateSection courseId={params.id} progress={progress} />
              ) : (
                <div className="rounded-xl border p-6 text-center bg-card">
                  <Award className="size-10 mx-auto text-muted-foreground/60" />
                  <p className="font-semibold mt-3 text-sm sm:text-base">
                    Certificates will be enabled once the course completes.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete your lessons to earn your official certificate of completion.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l bg-card flex-col">
          <div className="sticky top-14 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
              <div>
                <h3 className="font-bold text-sm text-foreground">Course Content</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{completedIds.size} of {flat.length} completed</p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{progress}%</Badge>
            </div>

            <Progress value={progress} className="h-1 rounded-none" />

            <ScrollArea className="flex-1 min-h-0">
              <div className="divide-y border-b">
                {course.chapters.map((ch, idx) => (
                  <ChapterAccordion
                    key={ch.id}
                    chapter={ch}
                    chapterIndex={idx}
                    activeId={activeId}
                    completed={completedIds}
                    owned={owned}
                    onSelect={(l) => setActiveId(l.id)}
                    isOpen={Boolean(openChapters[ch.id])}
                    onToggle={() => toggleChapter(ch.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

      </div>
    </div>
  )
}
