"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  Star, Users, PlayCircle, BarChart3, Clock, CheckCircle2,
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
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {showExpiredNotice && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
            Your access to this course has expired. Purchase again to regain access.
          </div>
        )}
        {owned ? (
          <>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" />
              <span className="font-semibold">You own this course</span>
            </div>
            <Button className="w-full" nativeButton={false} render={<Link href={`/learn/${course.id}`} />}>Go to course</Button>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold">{formatPrice(course.price)}</div>
              {course.originalPrice != null && course.originalPrice > course.price && (
                <>
                  <div className="text-lg text-muted-foreground line-through">{formatPrice(course.originalPrice)}</div>
                  <div className="rounded-md bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {Math.round((1 - course.price / course.originalPrice) * 100)}% off
                  </div>
                </>
              )}
            </div>
            <Button size="lg" className="w-full" onClick={handleBuy}>
              {showExpiredNotice ? "Repurchase" : "Buy Now"}
            </Button>
          </>
        )}
        <Separator />
        <ul className="flex flex-col gap-3 text-sm">
          {course.duration && (
            <li className="flex items-center gap-2.5"><Clock className="size-4 text-muted-foreground" />{course.duration} of content</li>
          )}
          <li className="flex items-center gap-2.5"><BookOpen className="size-4 text-muted-foreground" />{totalLessons(course.chapters)} on-demand lessons</li>
          <li className="flex items-center gap-2.5"><Clock className="size-4 text-muted-foreground" />{formatValidity(course.validityDays)}</li>
          <li className="flex items-center gap-2.5"><Smartphone className="size-4 text-muted-foreground" />Access on mobile and desktop</li>
          {course.certificatesEnabled && (
            <li className="flex items-center gap-2.5"><Award className="size-4 text-muted-foreground" />Certificate of completion</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />Back
        </Button>

        {/* Mobile purchase card */}
        <div className="lg:hidden">{purchaseCard}</div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div>
              <Badge variant="secondary" className="mb-3">{course.category}</Badge>
              <h1 className="text-balance text-2xl font-bold tracking-tight md:text-3xl">{course.title}</h1>
              <p className="mt-3 text-pretty text-muted-foreground">{course.shortDescription}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Star className="size-4 fill-chart-4 text-chart-4" />{course.rating || "New"}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="size-4" />{course.students.toLocaleString()} students
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <BarChart3 className="size-4" />{course.level}
                </span>
                <span className="text-muted-foreground">by {course.instructor}</span>
              </div>
            </div>

            <div className="group relative cursor-zoom-in overflow-hidden rounded-xl border"
              onClick={() => setLightboxOpen(true)}
              role="button"
              aria-label="View full image"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
            >
              <img src={course.thumbnail || "/placeholder.svg"} alt={course.title}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <ZoomIn className="size-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            {/* Instructor profile — shown above course description */}
            {course.instructorProfile && (
              course.instructorProfile.degree || course.instructorProfile.organization || course.instructorProfile.bio
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle>Your instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {course.instructor.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="font-semibold text-base">{course.instructor}</p>
                      {(course.instructorProfile.degree || course.instructorProfile.organization) && (
                        <p className="text-sm italic text-muted-foreground">
                          {[course.instructorProfile.degree, course.instructorProfile.organization]
                            .filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {course.instructorProfile.bio && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                          {course.instructorProfile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>About this course</CardTitle></CardHeader>
              <CardContent>
                <p className="text-pretty leading-relaxed text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Curriculum</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {course.chapters.length} chapters • {totalLessons(course.chapters)} lessons
                </p>
              </CardHeader>
              <CardContent>
                <Accordion defaultValue={course.chapters[0] ? [course.chapters[0].id] : []}>
                  {course.chapters.map((ch, idx) => (
                    <AccordionItem key={ch.id} value={ch.id}>
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-left">
                          <span className="text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
                          {ch.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="flex flex-col gap-1">
                          {ch.lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <PlayCircle className="size-4 shrink-0" />
                                {l.preview && !owned ? (
                                  <Link
                                    href={`/learn/${course.id}?lesson=${l.id}`}
                                    className="min-w-0 flex-1 break-words text-primary underline-offset-4 hover:underline"
                                  >
                                    {l.title}
                                  </Link>
                                ) : (
                                  <span className="min-w-0 flex-1 break-words">{l.title}</span>
                                )}
                                {l.preview && <Badge variant="outline" className="ml-1 shrink-0 text-xs">Free</Badge>}
                              </span>
                              <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3" />{l.duration}
                              </span>
                            </li>
                          ))}
                          {ch.lessons.length === 0 && (
                            <li className="px-2 py-1.5 text-sm text-muted-foreground">No lessons yet.</li>
                          )}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:col-span-1 lg:block">
            <div className="lg:sticky lg:top-20">{purchaseCard}</div>
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
