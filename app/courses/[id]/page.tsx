"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  Star, Users, PlayCircle, BarChart3, Clock,
  ArrowLeft, BookOpen, Award, Smartphone, Share2, ZoomIn, X,
} from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
import { CheckoutDialog } from "@/components/checkout-dialog"
import { useSession } from "@/lib/session"
import { coursesApi, purchasesApi, type Purchase } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { formatPrice, totalLessons, formatValidity, daysRemaining } from "@/lib/format"

const REFERRAL_KEY = "referral_code"

function safeSessionGet(key: string): string {
  try { return sessionStorage.getItem(key) ?? "" } catch { return "" }
}
function safeSessionSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value) } catch {}
}
function safeSessionRemove(key: string) {
  try { sessionStorage.removeItem(key) } catch {}
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useSession()

  const [course, setCourse]         = useState<Course | null>(null)
  const [purchases, setPurchases]   = useState<Purchase[]>([])
  const [loading, setLoading]       = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setLightboxOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxOpen])

  // Capture referral code from URL → sessionStorage so it survives login redirects
  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref) safeSessionSet(REFERRAL_KEY, ref.toUpperCase())
  }, [searchParams])

  useEffect(() => {
    coursesApi.get(params.id).then(setCourse).catch(() => setCourse(null)).finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (user) purchasesApi.list().then(setPurchases).catch(() => {})
  }, [user])

  if (loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  if (!course) return (
    <AppShell>
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Course not found</h1>
        <Button nativeButton={false} render={<Link href="/" />}>Back to courses</Button>
      </div>
    </AppShell>
  )

  const owned = purchases.some((p) => {
    if (p.courseId !== course.id) return false
    return !p.expiresAt || new Date(p.expiresAt) > new Date()
  })
  const expiredPurchase = purchases.find((p) => p.courseId === course.id && p.expiresAt && new Date(p.expiresAt) <= new Date())
  const wasExpired = !owned && Boolean(expiredPurchase)
  const showExpiredNotice = wasExpired || searchParams.get("expired") === "1"

  function handleBuy() {
    if (!user) {
      toast.info("Please sign in to purchase this course.")
      // Preserve the referral code in the redirect URL so it survives auth
      const ref = safeSessionGet(REFERRAL_KEY) || searchParams.get("ref") || ""
      const courseUrl = `/courses/${course!.id}${ref ? `?ref=${ref}` : ""}`
      router.push(`/auth?redirect=${encodeURIComponent(courseUrl)}`)
      return
    }
    setCheckoutOpen(true)
  }

  async function handleSuccess(paymentId: string) {
    // Clear referral code after a successful purchase
    safeSessionRemove(REFERRAL_KEY)
    try {
      const refreshedPurchases = await purchasesApi.list()
      setPurchases(refreshedPurchases)
    } catch {
      // Ignore refresh errors and continue to the learning area.
    }

    toast.success("Course unlocked! Happy learning.")
    setCheckoutOpen(false)
    router.replace("/my-courses")
    router.refresh()
  }

  const purchaseCard = (
    <Card className="overflow-hidden border-border/60 shadow-md">
      <CardContent className="flex flex-col gap-4 p-6">
        {showExpiredNotice && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
            Your access to this course has expired. Purchase again to regain access.
          </div>
        )}
        {owned ? (
          <Button size="lg" className="w-full font-bold h-11 gap-2" nativeButton={false} render={<Link href={`/learn/${course.id}`} />}>
            <PlayCircle className="size-4" /> Go to Course
          </Button>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-extrabold">{formatPrice(course.price)}</div>
              {course.originalPrice != null && course.originalPrice > course.price && (
                <>
                  <div className="text-lg text-muted-foreground line-through decoration-1">{formatPrice(course.originalPrice)}</div>
                  <Badge variant="secondary" className="bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold">
                    {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                  </Badge>
                </>
              )}
            </div>
            <Button size="lg" className="w-full font-bold h-11" onClick={handleBuy}>
              {showExpiredNotice ? "Repurchase" : "Buy Now"}
            </Button>
          </>
        )}
        <Separator />
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          {course.duration && (
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-foreground/75" />
              <span>{course.duration} of content</span>
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <BookOpen className="size-4 shrink-0 text-foreground/75" />
            <span>{totalLessons(course.chapters)} on-demand lessons</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Clock className="size-4 shrink-0 text-foreground/75" />
            <span>{formatValidity(course.validityDays)}</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Smartphone className="size-4 shrink-0 text-foreground/75" />
            <span>Access on mobile and desktop</span>
          </li>
          {course.certificatesEnabled && (
            <li className="flex items-center gap-2.5">
              <Award className="size-4 shrink-0 text-foreground/75" />
              <span className="font-semibold text-foreground/90">Certificate of completion</span>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 pt-0 pb-6 md:pt-2 md:pb-8 flex flex-col gap-6">
        {/* Back Button */}
        <div>
          <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground hover:text-foreground" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft className="mr-2 size-4" /> Back to Courses
          </Button>
        </div>

        {/* Course Banner (Thumbnail) */}
        <div 
          className="group relative cursor-zoom-in overflow-hidden rounded-2xl border bg-muted aspect-video max-h-[480px] w-full shadow-xs"
          onClick={() => setLightboxOpen(true)}
          role="button"
          aria-label="View full image"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
        >
          <img 
            src={course.thumbnail || "/placeholder.svg"} 
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-102" 
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <ZoomIn className="size-8 text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        {/* Mobile: Price / Purchase Card — shown between banner and title */}
        <div className="lg:hidden">
          {purchaseCard}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Title, Metadata, About, Syllabus, Instructor */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            
            {/* Course Header Title Block */}
            <div className="space-y-4">
              <Badge variant="secondary" className="uppercase tracking-wider text-xs">{course.category}</Badge>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl leading-tight">
                {course.title}
              </h1>
              <p className="text-pretty text-base md:text-lg text-muted-foreground leading-relaxed">
                {course.shortDescription}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-muted-foreground pt-2">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-4 fill-amber-400 text-amber-400" />{course.rating || "New"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4 text-muted-foreground/80" />{course.students.toLocaleString()} students enrolled
                </span>
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="size-4 text-muted-foreground/80" />{course.level}
                </span>
                <span>by <span className="font-medium text-foreground">{course.instructor}</span></span>
              </div>
            </div>

            {/* About this course */}
            <Card className="border-border/60 shadow-2xs">
              <CardHeader><CardTitle className="text-lg md:text-xl">About this course</CardTitle></CardHeader>
              <CardContent>
                <p className="text-pretty leading-relaxed text-muted-foreground text-sm md:text-base whitespace-pre-line">
                  {course.description}
                </p>
              </CardContent>
            </Card>

            {/* Curriculum */}
            <Card className="border-border/60 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Course Syllabus</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {course.chapters.length} chapters • {totalLessons(course.chapters)} lessons
                </p>
              </CardHeader>
              <CardContent>
                <Accordion defaultValue={course.chapters[0] ? [course.chapters[0].id] : []}>
                  {course.chapters.map((ch, idx) => (
                    <AccordionItem key={ch.id} value={ch.id} className="border-b last:border-0">
                      <AccordionTrigger className="hover:no-underline py-4 min-w-0">
                        <span className="text-left font-bold text-sm md:text-base text-foreground/95 hover:text-primary transition-colors leading-snug">
                          {ch.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-1">
                        <ul className="flex flex-col gap-1.5 pl-2">
                          {ch.lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs md:text-sm hover:bg-muted/40 transition-colors group min-w-0">
                              <span className="flex items-center gap-2.5 text-muted-foreground min-w-0 flex-1">
                                <PlayCircle className="size-4 shrink-0 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                {owned || l.preview ? (
                                  <Link
                                    href={`/learn/${course.id}?lesson=${l.id}`}
                                    className="min-w-0 flex-1 truncate text-primary font-semibold hover:underline text-left"
                                  >
                                    {l.title}
                                  </Link>
                                ) : (
                                  <span className="min-w-0 flex-1 truncate text-foreground/85">{l.title}</span>
                                )}
                                {l.preview && !owned && (
                                  <Badge variant="secondary" className="ml-1.5 shrink-0 text-[9px] px-1 py-0 h-4 font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
                                    Preview
                                  </Badge>
                                )}
                              </span>
                              <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-[11px] md:text-xs text-muted-foreground font-mono font-medium">
                                <Clock className="size-3" />{l.duration}
                              </span>
                            </li>
                          ))}
                          {ch.lessons.length === 0 && (
                            <li className="px-3 py-2 text-xs md:text-sm text-muted-foreground italic">No lessons in this module yet.</li>
                          )}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Instructor profile */}
            {course.instructorProfile && (
              course.instructorProfile.degree || course.instructorProfile.organization || course.instructorProfile.bio
            ) && (
              <Card className="border-border/60 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Your Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-start gap-5">
                    <div className="flex size-16 md:size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-2xl md:text-3xl font-extrabold text-primary border border-primary/15">
                      {course.instructor.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="font-extrabold text-base md:text-lg text-foreground">{course.instructor}</p>
                      {(course.instructorProfile.degree || course.instructorProfile.organization) && (
                        <p className="text-xs md:text-sm italic font-medium text-muted-foreground">
                          {[course.instructorProfile.degree, course.instructorProfile.organization]
                            .filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {course.instructorProfile.bio && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                          {course.instructorProfile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column: Floating Sidebar Card (only visible on desktop) */}
          <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-8">
            {purchaseCard}
          </div>
        </div>
      </div>

      <CheckoutDialog course={course} open={checkoutOpen} onOpenChange={setCheckoutOpen} onSuccess={handleSuccess} />

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Course banner"
        >
          {/* Close button */}
          <button
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {/* Image — stop click from bubbling to backdrop */}
          <img
            src={course.thumbnail || "/placeholder.svg"}
            alt={course.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90svh] max-w-full rounded-xl object-contain shadow-2xl"
            style={{ cursor: "default" }}
          />
        </div>
      )}
    </AppShell>
  )
}
