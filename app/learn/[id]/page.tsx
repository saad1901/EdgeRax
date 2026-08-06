"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, CheckCircle2, ExternalLink, PlayCircle, Clock, FileText,
  Award, Download, Lock, AlertCircle,
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { resolveVideoUrl } from "@/lib/video"

// ─── Certificate types ────────────────────────────────────────────────────────

interface Certificate {
  id:                string
  userId:            string
  courseId:          string
  certificateName:   string
  certificateNumber: string
  issuedAt:          string
  pdfPath:           string
}

// ─── Certificate section ──────────────────────────────────────────────────────

function CertificateSection({ courseId, progress }: { courseId: string; progress: number }) {
  const [cert, setCert]           = useState<Certificate | null | undefined>(undefined) // undefined = loading
  const [nameInput, setNameInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isUnlocked = progress >= 80

  // Load existing certificate on mount
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
      toast.success("Certificate generated!")
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

  // Still loading certificate state
  if (cert === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Checking certificate status…
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      !isUnlocked && "opacity-80",
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          cert ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
               : isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {cert ? <Award className="size-4" /> : isUnlocked ? <Award className="size-4" /> : <Lock className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">Certificate of Completion</p>
          <p className="text-xs text-muted-foreground">
            {cert
              ? `Issued · ${cert.certificateNumber}`
              : isUnlocked
                ? "You've unlocked your certificate"
                : `Complete at least 80% to unlock · ${progress}% done`}
          </p>
        </div>
        {!isUnlocked && (
          <Badge variant="secondary" className="shrink-0">
            {progress}% / 80%
          </Badge>
        )}
      </div>

      <div className="p-4">
        {/* Locked state */}
        {!isUnlocked && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Lock className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Almost there!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete {80 - progress}% more of this course to unlock your certificate.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground text-right">{progress}% of 80% required</p>
            </div>
          </div>
        )}

        {/* Unlocked — no certificate yet: name entry */}
        {isUnlocked && !cert && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>Important:</strong> The name you enter below will be printed on your certificate and{" "}
                <strong>cannot be changed</strong> after submission.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cert-name" className="text-xs font-medium text-foreground">
                Full name for certificate
              </label>
              <div className="flex gap-2">
                <Input
                  id="cert-name"
                  placeholder="Enter your full name exactly as you want it printed"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmitName()}
                  className="flex-1"
                  disabled={submitting}
                  maxLength={100}
                />
                <Button onClick={handleSubmitName} disabled={submitting || !nameInput.trim()}>
                  {submitting ? <Spinner data-icon="inline-start" /> : <Award data-icon="inline-start" />}
                  {submitting ? "Generating…" : "Get Certificate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This name will appear on your official certificate. Double-check before submitting.
              </p>
            </div>
          </div>
        )}

        {/* Certificate issued — download */}
        {cert && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <div>
                <p className="font-medium text-muted-foreground">Name on certificate</p>
                <p className="mt-0.5 font-semibold">{cert.certificateName}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Certificate no.</p>
                <p className="mt-0.5 font-mono font-semibold">{cert.certificateNumber}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Issued on</p>
                <p className="mt-0.5 font-semibold">
                  {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Issued by</p>
                <p className="mt-0.5 font-semibold">Edgerax</p>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto">
              {downloading
                ? <><Spinner data-icon="inline-start" />Downloading…</>
                : <><Download data-icon="inline-start" />Download Certificate (PDF)</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface FlatLesson { chapterTitle: string; lesson: Lesson }

function PdfArea({ lesson }: { lesson: Lesson | null }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!lesson || lesson.lessonType !== "PDF" || !lesson.pdfPath) {
      setBlobUrl(null); setError(""); return
    }
    setLoading(true); setError(""); setBlobUrl(null)
    fetch(lesson.pdfPath, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`)
        const blob = await res.blob()
        setBlobUrl(URL.createObjectURL(blob))
      })
      .catch((e) => setError(e.message ?? "Failed to load PDF."))
      .finally(() => setLoading(false))
    return () => {
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    }
  }, [lesson?.id, lesson?.pdfPath])

  function handleDownload() {
    if (!blobUrl) return
    setDownloading(true)
    try {
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = (lesson?.pdfTitle || lesson?.title || "lesson") + ".pdf"
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  if (!lesson || lesson.lessonType !== "PDF") return null

  if (!lesson.pdfPath) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border bg-muted/30 p-6 text-center">
        <FileText className="size-12 text-muted-foreground" />
        <p className="mt-3 font-medium">PDF is not available yet.</p>
        <p className="text-sm text-muted-foreground">Upload a PDF for this lesson to view it here.</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="font-medium truncate">{lesson.pdfTitle || lesson.title}</p>
          <p className="text-xs text-muted-foreground">Scroll to navigate · use the button to download</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-3 shrink-0 gap-1.5"
          onClick={handleDownload}
          disabled={!blobUrl || downloading}
          aria-label="Download PDF"
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
      </div>
      <div className="h-[80vh] bg-muted/20">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Spinner className="size-5" />
            <span className="text-sm">Loading PDF…</span>
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <FileText className="size-10 text-muted-foreground" />
            <p className="font-medium text-sm">Failed to load PDF</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            title={lesson.pdfTitle || lesson.title}
            className="h-full w-full border-0"
            aria-label={lesson.pdfTitle || lesson.title}
          />
        )}
      </div>
    </div>
  )
}

function LinkArea({ lesson }: { lesson: Lesson | null }) {
  if (!lesson || lesson.lessonType !== "URL") return null

  const raw = (lesson.urlLink || lesson.videoUrl || "").trim()

  // Ensure the URL has a protocol so the browser doesn't treat it as a
  // relative path (which would prepend the current origin).
  const url = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw

  if (!url) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border bg-muted/30 p-6 text-center">
        <ExternalLink className="size-12 text-muted-foreground" />
        <p className="mt-3 font-medium">URL is not available yet.</p>
        <p className="text-sm text-muted-foreground">Add a valid URL for this lesson in the admin panel.</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border bg-background p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ExternalLink className="size-5" />
          <div>
            <p className="font-medium">Open link</p>
            <p className="truncate text-xs">{raw}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open external lesson link
        </a>
      </div>
    </div>
  )
}

function VideoArea({ lesson, lessonId }: { lesson: Lesson | null; lessonId: string | null }) {
  const [videoError, setVideoError] = useState(false)
  const [errorMsg, setErrorMsg]     = useState("")

  // Reset on lesson change
  useEffect(() => { setVideoError(false); setErrorMsg("") }, [lessonId])

  if (!lesson || !lessonId || lesson.lessonType === "PDF" || lesson.lessonType === "URL") return null

  const source = resolveVideoUrl(lesson.videoUrl ?? "", lessonId)

  // ── Determine if this is an "owned" video (uploaded by us)
  // These should NEVER fall back to "open in new tab" — always render a player
  const isOwnVideo = source.type === "local" || source.type === "video"

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-black">
      {/* 16:9 intrinsic ratio wrapper */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>

        {/* ── iframe sources (YouTube, Vimeo, etc.) ── */}
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

        {/* ── Video sources: local proxy, CDN URL, or direct file ── */}
        {isOwnVideo && !videoError && (
          <video
            key={source.src}
            src={source.src}
            controls
            playsInline
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload"
            onError={(e) => {
              const vid = e.currentTarget as HTMLVideoElement
              const code = vid.error?.code
              const msg  = vid.error?.message ?? ""
              // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
              setErrorMsg(`Video error (code ${code ?? "?"}: ${msg || "unknown"}) — src: ${source.src}`)
              setVideoError(true)
            }}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "contain", background: "#000",
            }}
          />
        )}

        {/* ── Error state for own videos — show diagnostic info, not "open in new tab" ── */}
        {isOwnVideo && videoError && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white"
          >
            <PlayCircle className="size-12 opacity-50" />
            <p className="text-sm font-medium">Video failed to load</p>
            <p className="max-w-xs text-xs opacity-60 break-all">{errorMsg}</p>
            <button
              onClick={() => { setVideoError(false); setErrorMsg("") }}
              className="mt-1 rounded-md bg-white/10 px-4 py-1.5 text-xs hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── "open" type — truly unembeddable external URLs ── */}
        {source.type === "open" && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
          >
            <PlayCircle className="size-14 opacity-70" />
            <p className="text-sm opacity-80">This video can&apos;t be embedded directly.</p>
            <a
              href={source.src}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open video in new tab
            </a>
          </div>
        )}

        {/* ── Empty placeholder ── */}
        {source.type === "empty" && (
          <div
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            className="flex flex-col items-center justify-center gap-3 bg-black text-white"
          >
            <PlayCircle className="size-16 opacity-50" />
            <p className="px-4 text-center text-sm opacity-60">No video for this lesson yet.</p>
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

function LessonList({ chapters, activeId, completed, owned, onSelect }: {
  chapters: Chapter[]; activeId: string | null; completed: Set<string>; owned: boolean; onSelect: (l: Lesson) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {chapters.map((ch, idx) => (
        <div key={ch.id} className="flex flex-col gap-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {String(idx + 1).padStart(2, "0")} · {ch.title}
          </p>
          {ch.lessons.map((l) => {
            const isActive = l.id === activeId
            const isDone = completed.has(l.id)
            const isLocked = !owned && !l.preview
            return (
              <button key={l.id}
                onClick={() => !isLocked && onSelect(l)}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary" : isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-muted",
                )}>
                <div className="relative flex size-5 shrink-0 items-center justify-center">
                  {isLocked
                    ? <Lock className="size-4 shrink-0 text-muted-foreground" />
                    : <LessonTypeIcon lessonType={l.lessonType} className="size-4 shrink-0 text-muted-foreground" />
                  }
                  {isDone && !isLocked && <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-background text-primary" />}
                </div>
                <span className="flex-1 leading-snug">{l.title}</span>
                {l.preview && !owned && (
                  <Badge variant="outline" className="shrink-0 text-xs">Free</Badge>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LessonTypeIcon lessonType={l.lessonType} className="size-3" />
                  {l.duration}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, ready } = useSession()

  const [course, setCourse]           = useState<Course | null>(null)
  const [completedIds, setCompleted]  = useState<Set<string>>(new Set())
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [marking, setMarking]         = useState(false)
  const [owned, setOwned]             = useState(false)

  // Load course
  useEffect(() => {
    coursesApi.get(params.id).then(setCourse).catch(() => setCourse(null)).finally(() => setLoadingCourse(false))
  }, [params.id])

  // Load progress
  useEffect(() => {
    if (user && params.id) {
      progressApi.get(params.id).then((ids) => setCompleted(new Set(ids))).catch(() => {})
    }
  }, [user, params.id])

  // Access control — allow free-preview access; only purchased users get full access
  useEffect(() => {
    if (!ready) return
    if (!course) return

    // Check if the course has any free preview lessons
    const hasPreview = course.chapters.some((ch) => ch.lessons.some((l) => l.preview))

    if (!user) {
      // Unauthenticated users may only stay if there are free previews
      if (!hasPreview) {
        router.push(`/auth?redirect=/learn/${params.id}`)
      }
      return
    }

    // Authenticated — check purchase status
    purchasesApi.list().then((ps) => {
      const purchase = ps.find((p) => p.courseId === params.id)
      if (!purchase) {
        // No purchase — allow if there are free previews, otherwise redirect
        if (!hasPreview) {
          router.push(`/courses/${params.id}`)
        }
        return
      }
      // Check expiry
      if (purchase.expiresAt && new Date(purchase.expiresAt) <= new Date()) {
        router.push(`/courses/${params.id}?expired=1`)
        return
      }
      setOwned(true)
    }).catch(() => {})
  }, [ready, user, course, params.id, router])

  const flat: FlatLesson[] = useMemo(() => {
    if (!course) return []
    return course.chapters.flatMap((ch) => ch.lessons.map((lesson) => ({ chapterTitle: ch.title, lesson })))
  }, [course])

  useEffect(() => {
    if (flat.length && !activeId) {
      // Use ?lesson= param if present and valid, otherwise default to first available lesson
      const requestedId = searchParams.get("lesson")
      const requestedLesson = requestedId ? flat.find((f) => f.lesson.id === requestedId) : null
      const firstLesson = owned
        ? flat[0].lesson
        : (flat.find((f) => f.lesson.preview)?.lesson ?? flat[0].lesson)
      setActiveId(requestedLesson?.lesson.id ?? firstLesson.id)
    }
  }, [flat, activeId, owned, searchParams])

  const activeLesson = flat.find((f) => f.lesson.id === activeId)?.lesson ?? null
  const progress = flat.length ? Math.round((completedIds.size / flat.length) * 100) : 0
  // Can the active lesson be viewed? Owned users can view all; others only free previews.
  const canViewActive = owned || Boolean(activeLesson?.preview)

  async function markComplete() {
    if (!activeLesson || marking || !owned) return
    setMarking(true)
    try {
      await progressApi.mark(activeLesson.id)
      setCompleted((prev) => new Set(prev).add(activeLesson.id))
      const idx = flat.findIndex((f) => f.lesson.id === activeLesson.id)
      if (idx >= 0 && idx < flat.length - 1) setActiveId(flat[idx + 1].lesson.id)
    } catch { /* ignore */ } finally {
      setMarking(false)
    }
  }

  if (loadingCourse || !ready) {
    return <div className="flex min-h-svh items-center justify-center"><Spinner className="size-8" /></div>
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
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
              <ArrowLeft />
            </Button>
            <Image src="/logo.png" alt="Edgerax" width={28} height={28} className="rounded-md bg-black p-1" />
            <p className="truncate text-sm font-semibold">{course.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-20 sm:w-28" />
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile layout: stacked ── Desktop layout: side-by-side ── */}
      <div className="flex flex-1 flex-col lg:flex-row lg:gap-0">

        {/* ── Left / main column ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Player — flush to screen edges on mobile */}
          <div className="w-full lg:px-6 lg:pt-6">
            {!canViewActive ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 bg-muted/30 p-8 text-center lg:rounded-xl lg:border">
                <Lock className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-semibold">This lesson is locked</p>
                  <p className="mt-1 text-sm text-muted-foreground">Purchase the course to unlock all lessons.</p>
                </div>
                <Button nativeButton={false} render={<Link href={`/courses/${course.id}`} />}>
                  View course &amp; buy
                </Button>
              </div>
            ) : activeLesson?.lessonType === "PDF" ? (
              <div className="lg:rounded-xl lg:border lg:overflow-hidden"><PdfArea lesson={activeLesson} /></div>
            ) : activeLesson?.lessonType === "URL" ? (
              <div className="px-4 lg:px-0"><LinkArea lesson={activeLesson} /></div>
            ) : (
              /* Video — no border/radius on mobile so it's edge-to-edge */
              <div className="w-full overflow-hidden bg-black lg:rounded-xl lg:border">
                <VideoArea lesson={activeLesson} lessonId={activeId} />
              </div>
            )}
          </div>

          {/* Lesson meta + mark complete */}
          <div className="flex flex-col gap-2 px-4 pt-3 pb-2 lg:px-6 lg:py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {flat.find((f) => f.lesson.id === activeId)?.chapterTitle}
            </p>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <h1 className="text-balance text-base font-semibold leading-snug sm:text-lg">
                  {activeLesson?.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="w-fit text-xs">
                    {activeLesson?.lessonType === "PDF" ? "PDF" : activeLesson?.lessonType === "URL" ? "URL" : "Video"}
                  </Badge>
                  {activeLesson?.preview && !owned && (
                    <Badge variant="secondary" className="w-fit text-xs">Free preview</Badge>
                  )}
                </div>
              </div>
              {owned && (
                <Button onClick={markComplete} size="sm" className="shrink-0"
                  disabled={!activeLesson || completedIds.has(activeLesson.id) || marking}>
                  {marking ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                  {activeLesson && completedIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
                </Button>
              )}
            </div>
            {!owned && (
              <Button nativeButton={false} render={<Link href={`/courses/${course.id}`} />}
                variant="outline" size="sm" className="mt-1 w-fit">
                Purchase for full access
              </Button>
            )}
          </div>

          {/* Certificate — desktop only (mobile shows it at very bottom) */}
          {owned && course.certificatesEnabled && (
            <div className="hidden px-6 pb-6 lg:block">
              <CertificateSection courseId={params.id} progress={progress} />
            </div>
          )}
        </div>

        {/* ── Mobile: inline lesson list below player ── */}
        <div className="lg:hidden">
          <div>
            <div className="flex items-center justify-between border-y bg-muted/30 px-4 py-2.5">
              <p className="text-sm font-semibold">Course content</p>
              <span className="text-xs text-muted-foreground">{completedIds.size}/{flat.length} lessons</span>
            </div>
            {/* Flat lesson list — always visible, no sheet */}
            <div className="divide-y">
              {course.chapters.map((ch, chIdx) => {
                // Global lesson counter offset for this chapter
                const offset = course.chapters
                  .slice(0, chIdx)
                  .reduce((s, c) => s + c.lessons.length, 0)
                return (
                  <div key={ch.id}>
                    {/* Section header */}
                    <div className="flex items-center justify-between bg-muted/20 px-4 py-2">
                      <p className="text-xs font-semibold">
                        Section {chIdx + 1} · {ch.title}
                      </p>
                    </div>
                    {/* Lessons */}
                    {ch.lessons.map((l, lIdx) => {
                      const globalIdx = offset + lIdx + 1
                      const isActive = l.id === activeId
                      const isDone   = completedIds.has(l.id)
                      const isLocked = !owned && !l.preview
                      return (
                        <button
                          key={l.id}
                          onClick={() => !isLocked && setActiveId(l.id)}
                          disabled={isLocked}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            isActive ? "bg-primary/10" : isLocked ? "opacity-50" : "hover:bg-muted/50",
                          )}
                        >
                          {/* Number / done indicator */}
                          <span className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}>
                            {isDone ? <CheckCircle2 className="size-3.5" /> : globalIdx}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "truncate text-sm font-medium leading-snug",
                              isActive && "text-primary",
                            )}>
                              {isLocked && <Lock className="mr-1 inline size-3 text-muted-foreground" />}
                              {l.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <LessonTypeIcon lessonType={l.lessonType} className="size-3" />
                              {l.lessonType === "PDF" ? "PDF" : l.lessonType === "URL" ? "URL" : "Video"}
                              {l.duration ? ` · ${l.duration}` : ""}
                              {l.preview && !owned && (
                                <span className="ml-1 rounded border px-1 py-px text-[10px] font-medium">Free</span>
                              )}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Certificate at bottom on mobile */}
          {owned && course.certificatesEnabled && (
            <div className="p-4">
              <CertificateSection courseId={params.id} progress={progress} />
            </div>
          )}
        </div>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-80 shrink-0 border-l lg:flex lg:flex-col">
          <div className="sticky top-14 flex flex-col" style={{ height: "calc(100svh - 3.5rem)" }}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-sm">Course content</p>
              <span className="text-xs text-muted-foreground">{progress}% done</span>
            </div>
            <Progress value={progress} className="h-1 rounded-none" />
            <ScrollArea className="flex-1">
              <div className="px-3 pb-6 pt-2">
                <LessonList chapters={course.chapters} activeId={activeId}
                  completed={completedIds} owned={owned} onSelect={(l) => setActiveId(l.id)} />
              </div>
            </ScrollArea>
          </div>
        </aside>

      </div>
    </div>
  )
}
