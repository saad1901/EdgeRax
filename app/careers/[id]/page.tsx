"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Briefcase, Clock, Banknote, Users, CalendarDays,
  CheckCircle2, Upload, FileText, Lock, ShieldCheck, AlertCircle, Loader2,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import type { Internship } from "@/lib/internship-types"



export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useSession()

  const [internship, setInternship] = useState<Internship | null>(null)
  const [loading, setLoading]       = useState(true)
  const [hasApplied, setHasApplied] = useState(false)
  const [applyOpen, setApplyOpen]   = useState(false)

  useEffect(() => {
    fetch(`/api/internships/${id}`)
      .then((r) => r.json())
      .then(setInternship)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Check if user has already applied
  useEffect(() => {
    if (!user) return
    fetch("/api/my-internships", { credentials: "include" })
      .then((r) => r.json())
      .then((apps: any[]) => {
        setHasApplied(apps.some((a: any) => a.internshipId === id))
      })
      .catch(() => {})
  }, [user, id])

  if (loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  if (!internship) return <AppShell><p className="py-20 text-center text-muted-foreground">Internship not found.</p></AppShell>

  const perks: string[] = (() => { try { return JSON.parse(internship.perks || "[]") } catch { return [] } })()
  const deadline = internship.lastDateToApply ? new Date(internship.lastDateToApply) : null
  const startDate = internship.startDate ? new Date(internship.startDate) : null
  const isClosed = internship.status === "closed" || (deadline ? deadline < new Date() : false)
  const isFree = Number(internship.applicationFee) === 0

  return (
    <AppShell>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <Button variant="ghost" size="sm" className="-ml-2 mb-4" nativeButton={false} render={<Link href="/careers" />}>
              <ArrowLeft className="mr-1 size-4" />Back to Careers
            </Button>

            {internship.thumbnail && (
              <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl bg-muted">
                <img src={internship.thumbnail} alt={internship.title} className="size-full object-cover" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{internship.domain || "General"}</Badge>
              <Badge variant={isClosed ? "destructive" : "default"}>
                {isClosed ? "Closed" : "Open"}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{internship.title}</h1>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Clock,        label: "Duration",  value: internship.duration || "Flexible" },
              { icon: Banknote,     label: "Stipend",   value: internship.stipend || "Unpaid" },
              { icon: Users,        label: "Seats",     value: internship.seats > 0 ? String(internship.seats) : "Open" },
              { icon: CalendarDays, label: "Starts",    value: startDate ? startDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "TBD" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/30 p-3">
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {internship.description && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">About this Internship</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{internship.description}</p>
            </div>
          )}

          {/* Requirements */}
          {internship.requirements && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">Requirements</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{internship.requirements}</p>
            </div>
          )}

          {/* Perks */}
          {perks.length > 0 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">What You&apos;ll Get</h2>
              <ul className="flex flex-col gap-2">
                {perks.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar / Apply card */}
        <div className="shrink-0 md:w-72">
          <div className="sticky top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Application Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Registration fee</span>
                    <span className="font-semibold">
                      {isFree ? <span className="text-green-600">Free</span> : formatPrice(Number(internship.applicationFee))}
                    </span>
                  </div>
                  {!isFree && (
                    <p className="text-[11px] leading-normal text-muted-foreground bg-muted/50 p-2.5 rounded border border-dashed border-primary/20">
                      * This nominal fee covers training materials, online labs, and curriculum resources.
                    </p>
                  )}
                  {deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last date</span>
                      <span className="font-semibold">{deadline.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {hasApplied ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CheckCircle2 className="size-8 text-green-500" />
                    <p className="text-sm font-medium">Application Submitted</p>
                    <Button variant="outline" size="sm" className="w-full" nativeButton={false} render={<Link href="/my-internships" />}>
                      View Status
                    </Button>
                  </div>
                ) : isClosed ? (
                  <Button disabled className="w-full">Applications Closed</Button>
                ) : !user ? (
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" nativeButton={false} render={<Link href={`/auth?redirect=/careers/${id}`} />}>
                      Sign in to Apply
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">You need an account to apply.</p>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setApplyOpen(true)}>
                    <Briefcase className="mr-2 size-4" />
                    Apply Now
                  </Button>
                )}

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Secured by Razorpay
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Apply dialog */}
      {internship && (
        <ApplyDialog
          internship={internship}
          open={applyOpen}
          onOpenChange={setApplyOpen}
          onSuccess={() => {
            setHasApplied(true)
            setApplyOpen(false)
            toast.success("Application submitted successfully!")
            router.push("/my-internships")
          }}
        />
      )}
    </AppShell>
  )
}

// ─── Apply Dialog ──────────────────────────────────────────────────────────────

type Phase = "form" | "processing" | "success" | "error"

function ApplyDialog({
  internship, open, onOpenChange, onSuccess,
}: {
  internship: Internship
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [phase, setPhase]           = useState<Phase>("form")
  const [coverLetter, setCoverLetter] = useState("")
  const [resumeFile, setResumeFile]   = useState<File | null>(null)
  const [resumeUrl, setResumeUrl]     = useState("")
  const [uploading, setUploading]     = useState(false)
  const [errorMsg, setErrorMsg]       = useState("")
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const orderIdRef                    = useRef<string | null>(null)
  const rzpRef                        = useRef<any>(null)
  const razorpayKey                   = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
  const isFree                        = Number(internship.applicationFee) === 0

  useEffect(() => {
    if (open) {
      setPhase("form")
      setCoverLetter("")
      setResumeFile(null)
      setResumeUrl("")
      setErrorMsg("")
      fetch("/api/site-settings").then((r) => r.json()).then(setSiteSettings).catch(() => {})
    }
  }, [open])

  // Load Razorpay script
  useEffect(() => {
    if (isFree || typeof window === "undefined") return
    if (window.Razorpay) return
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.async = true
    document.body.appendChild(s)
  }, [isFree])

  async function uploadResume(): Promise<string | null> {
    if (!resumeFile) return null
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", resumeFile)
      const res = await fetch("/api/upload/resume", { method: "POST", body: fd, credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Resume upload failed."); return null }
      return data.url as string
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!resumeFile && !resumeUrl) { toast.error("Please upload your resume (PDF)."); return }

    setPhase("processing")
    setErrorMsg("")

    // Upload resume if not already done
    let finalResumeUrl = resumeUrl
    if (resumeFile && !resumeUrl) {
      const url = await uploadResume()
      if (!url) { setPhase("form"); return }
      finalResumeUrl = url
      setResumeUrl(url)
    }

    if (isFree) {
      // Free application — submit directly
      try {
        const res = await fetch(`/api/internships/${internship.id}/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ resumeUrl: finalResumeUrl, coverLetter }),
        })
        const data = await res.json()
        if (!res.ok) { setErrorMsg(data.error ?? "Application failed."); setPhase("error"); return }
        setPhase("success")
        setTimeout(onSuccess, 800)
      } catch {
        setErrorMsg("Something went wrong. Please try again.")
        setPhase("error")
      }
      return
    }

    // Paid application — Razorpay flow
    try {
      const orderRes = await fetch("/api/razorpay/internship-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ internshipId: internship.id }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) { setErrorMsg(orderData.error ?? "Payment initiation failed."); setPhase("error"); return }

      orderIdRef.current = orderData.orderId

      if (!window.Razorpay) { setErrorMsg("Razorpay SDK failed to load."); setPhase("error"); return }

      rzpRef.current = new window.Razorpay({
        key:         razorpayKey,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        "Edgerax",
        description: internship.title,
        order_id:    orderData.orderId,
        prefill:     { name: orderData.userName, email: orderData.userEmail },
        theme:       { color: "#6366f1" },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => { setPhase("form") },
        },
        handler: async (response: any) => {
          rzpRef.current?.close()
          try {
            const verifyRes = await fetch("/api/razorpay/internship-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                internshipId:        internship.id,
                resumeUrl:           finalResumeUrl,
                coverLetter,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) { setErrorMsg(verifyData.error ?? "Payment verification failed."); setPhase("error"); return }
            setPhase("success")
            setTimeout(onSuccess, 800)
          } catch {
            setErrorMsg("Payment verification failed. Please contact support.")
            setPhase("error")
          }
        },
      })
      rzpRef.current.open()
    } catch {
      setErrorMsg("Something went wrong. Please try again.")
      setPhase("error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (phase !== "processing") onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply — {internship.title}</DialogTitle>
          <DialogDescription>
            {isFree ? "This is a free application." : `Registration fee: ${formatPrice(Number(internship.applicationFee))} (covers training materials & resources)`}
          </DialogDescription>
        </DialogHeader>

        {phase === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-14 text-green-500" />
            <p className="text-lg font-semibold">Application Submitted!</p>
            <p className="text-sm text-muted-foreground">We&apos;ll review your application and get back to you within 2–3 days.</p>
            {siteSettings?.phones && siteSettings.phones.length > 0 && (
              <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                If payment was deducted but access/status is not updated, please WhatsApp or call us at{" "}
                <span className="font-semibold text-foreground">{siteSettings.phones.join(", ")}</span>.
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <FieldGroup>
              {/* Resume Upload */}
              <Field>
                <FieldLabel>Resume <span className="text-destructive">*</span></FieldLabel>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => { setResumeFile(e.target.files?.[0] ?? null); setResumeUrl("") }}
                    disabled={phase === "processing" || uploading}
                  />
                  {uploading ? (
                    <Loader2 className="size-7 animate-spin text-muted-foreground" />
                  ) : resumeFile ? (
                    <>
                      <FileText className="size-7 text-primary" />
                      <span className="text-sm font-medium text-primary">{resumeFile.name}</span>
                      <span className="text-xs text-muted-foreground">Click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-7 text-muted-foreground" />
                      <span className="text-sm font-medium">Upload your resume</span>
                      <span className="text-xs text-muted-foreground">PDF only, max 5 MB</span>
                    </>
                  )}
                </label>
              </Field>

              {/* Cover Letter */}
              <Field>
                <FieldLabel>Cover Letter <span className="text-muted-foreground text-xs">(optional)</span></FieldLabel>
                <Textarea
                  placeholder="Tell us why you're interested in this internship and what makes you a great fit…"
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  disabled={phase === "processing"}
                />
              </Field>
            </FieldGroup>

            {phase === "error" && errorMsg && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={phase === "error" ? () => setPhase("form") : handleSubmit}
              disabled={phase === "processing" || uploading}
            >
              {(phase === "processing" || uploading) ? (
                <><Spinner data-icon="inline-start" />{uploading ? "Uploading…" : "Processing…"}</>
              ) : phase === "error" ? "Try Again" : isFree ? (
                "Submit Application"
              ) : (
                <>Pay {formatPrice(Number(internship.applicationFee))} & Apply</>
              )}
            </Button>

            {!isFree && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />Secured by Razorpay
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
