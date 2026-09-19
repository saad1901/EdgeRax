"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Briefcase, CheckCircle2, Clock, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, Send, ClipboardList, Award, FileText, Sparkles, CreditCard
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import type { Internship, InternshipApplication, InternshipTask } from "@/lib/internship-types"



interface EnrichedApplication extends InternshipApplication {
  internship: Internship | null
  tasks: InternshipTask[]
}

export default function MyInternshipsPage() {
  const { user, ready } = useSession()
  const [applications, setApplications] = useState<EnrichedApplication[]>([])
  const [loading, setLoading]           = useState(true)

  async function load() {
    try {
      const res = await fetch("/api/my-internships", { credentials: "include" })
      const data = await res.json()
      setApplications(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (ready && user) load()
    else if (ready) setLoading(false)
  }, [ready, user])

  // Load Razorpay script
  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) return
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.async = true
    document.body.appendChild(s)
  }, [])

  if (!ready || loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8 text-primary" /></div></AppShell>

  if (!user) return (
    <AppShell>
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Briefcase className="size-12 opacity-30 text-primary" />
        <h2 className="text-xl font-bold">Sign in to view your Internship Portal</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Track your applications, view official offer letters, pay joining fees, and submit tasks.
        </p>
        <Button nativeButton={false} render={<Link href="/auth?redirect=/my-internships" />}>Sign in to Account</Button>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Internship Portal & Applications</h1>
          <p className="text-muted-foreground text-sm">
            View offer letters, confirm your position, and complete your assigned tasks.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border bg-muted/40 py-16 px-4 text-center text-muted-foreground">
            <Briefcase className="mx-auto mb-3 size-12 opacity-30 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">No applications yet</h3>
            <p className="text-sm mt-1">Explore our current internship listings and start your career journey today.</p>
            <Button className="mt-4 gap-1.5" nativeButton={false} render={<Link href="/careers" />}>
              <Sparkles className="size-4" /> Browse Open Internships
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {applications.map((app) => (
              <ApplicationCard key={app.id} application={app} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ─── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({ application: app, onRefresh }: { application: EnrichedApplication; onRefresh: () => void }) {
  const [expanded, setExpanded]         = useState(true)
  const [submitOpen, setSubmitOpen]     = useState(false)
  const [activeTask, setActiveTask]     = useState<InternshipTask | null>(null)
  const [payingJoining, setPayingJoining] = useState(false)
  const [accepting, setAccepting]       = useState(false)

  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  const statusConfig = {
    pending:  { label: "Under Review", variant: "secondary" as const, icon: Clock, className: "" },
    offered:  { label: "Offer Extended 🎉", variant: "default" as const, icon: Award, className: "bg-amber-600 text-white" },
    accepted: { label: "Accepted & Onboarded 🎉", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600 text-white" },
    rejected: { label: "Not Selected", variant: "destructive" as const, icon: AlertTriangle, className: "" },
  }
  const sc = statusConfig[app.status as keyof typeof statusConfig] ?? statusConfig.pending

  const joiningFeeVal = Number(app.internship?.joiningFee || app.joiningFeeAmount || 0)
  const hasJoiningFee = joiningFeeVal > 0

  async function handlePayJoiningFee() {
    if (!razorpayKey) { toast.error("Payment gateway configuration error."); return }
    setPayingJoining(true)

    try {
      // 1. Create order
      const orderRes = await fetch("/api/razorpay/internship-joining-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applicationId: app.id }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) { toast.error(orderData.error ?? "Failed to initiate payment."); setPayingJoining(false); return }

      // 2. Open Razorpay modal
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Edgerax Careers",
        description: `Joining Fee for ${orderData.internshipTitle}`,
        order_id: orderData.orderId,
        prefill: { name: orderData.userName, email: orderData.userEmail },
        theme: { color: "#4F46E5" },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/razorpay/internship-joining-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                applicationId: app.id,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              toast.success("Joining fee paid! Offer accepted successfully 🎉")
              onRefresh()
            } else {
              toast.error(verifyData.error ?? "Payment verification failed.")
            }
          } catch {
            toast.error("Error confirming payment.")
          } finally {
            setPayingJoining(false)
          }
        },
        modal: { ondismiss: () => setPayingJoining(false) }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      toast.error("Something went wrong.")
      setPayingJoining(false)
    }
  }

  async function handleAcceptFreeOffer() {
    setAccepting(true)
    try {
      const res = await fetch("/api/my-internships/accept-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applicationId: app.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to accept offer."); return }
      toast.success("Offer accepted! Welcome to the team 🎉")
      onRefresh()
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setAccepting(false)
    }
  }

  return (
    <Card className="overflow-hidden border-2 transition-all">
      {/* Top Banner for Offered Status */}
      {app.status === "offered" && (
        <div className="bg-gradient-to-r from-amber-500 to-indigo-600 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-6 shrink-0 animate-bounce" />
            <div>
              <h3 className="font-bold text-base">Congratulations! You Have Received an Offer</h3>
              <p className="text-xs text-amber-100">Review your official offer letter below to accept your position.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {app.offerLetterUrl ? (
              <Button variant="secondary" size="sm" nativeButton={false} render={<a href={app.offerLetterUrl} target="_blank" rel="noopener noreferrer" />} className="text-xs font-semibold gap-1">
                <Award className="size-3.5" /> View Offer Letter PDF
              </Button>
            ) : (
              <Button variant="secondary" size="sm" nativeButton={false} render={<a href={`/api/offer-letter/${app.id}`} target="_blank" rel="noopener noreferrer" />} className="text-xs font-semibold gap-1">
                <Award className="size-3.5" /> Download Offer Letter
              </Button>
            )}
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold">{app.internship?.title ?? "Internship Position"}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {app.internship?.domain && (
                <Badge variant="secondary" className="text-xs">{app.internship.domain}</Badge>
              )}
              {app.internship?.duration && (
                <span className="text-xs text-muted-foreground">Duration: {app.internship.duration}</span>
              )}
            </div>
          </div>

          <Badge variant={sc.variant} className={`shrink-0 gap-1 px-3 py-1 text-xs ${sc.className || ""}`}>
            <sc.icon className="size-3.5" />{sc.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Application details bar */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4 bg-muted/40 p-3 rounded-xl border">
          <div><span className="font-semibold text-foreground">Applied:</span> {new Date(app.appliedAt).toLocaleDateString()}</div>
          <div><span className="font-semibold text-foreground">Stipend:</span> {app.internship?.stipend || "Unpaid"}</div>
          <div><span className="font-semibold text-foreground">App Fee:</span> {Number(app.amount) > 0 ? formatPrice(Number(app.amount)) : "Free"}</div>
          <div><span className="font-semibold text-foreground">Joining Fee:</span> {hasJoiningFee ? formatPrice(joiningFeeVal) : "Nil (Free)"}</div>
        </div>

        {/* Note from Hiring Manager */}
        {app.adminNote && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs text-indigo-950 dark:border-indigo-800/30 dark:bg-indigo-950/20 dark:text-indigo-200">
            <span className="font-bold block text-sm mb-1 text-indigo-700 dark:text-indigo-400">Note from Hiring Manager:</span>
            <p className="whitespace-pre-wrap">{app.adminNote}</p>
          </div>
        )}

        {/* Action Panel for Offered state */}
        {app.status === "offered" && (
          <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10 flex flex-col gap-3">
            {hasJoiningFee ? (
              <>
                <div className="flex items-start gap-3">
                  <CreditCard className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Joining & Onboarding Fee Required: {formatPrice(joiningFeeVal)}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      To complete your enrollment and claim your seat, please pay the joining fee. Once paid, your status updates to Accepted.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button onClick={handlePayJoiningFee} disabled={payingJoining} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 h-10 px-5">
                    {payingJoining ? <Spinner data-icon="inline-start" /> : <CreditCard className="size-4" />}
                    Pay {formatPrice(joiningFeeVal)} Joining Fee & Accept Offer
                  </Button>

                  {app.offerLetterUrl && (
                    <Button variant="outline" size="sm" nativeButton={false} render={<a href={app.offerLetterUrl} target="_blank" rel="noopener noreferrer" />} className="h-10 text-xs gap-1">
                      <FileText className="size-4 text-primary" /> Download Offer PDF
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Free Onboarding Position</h4>
                  <p className="text-xs text-muted-foreground">Click below to accept your internship offer and unlock tasks.</p>
                </div>

                <Button onClick={handleAcceptFreeOffer} disabled={accepting} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9 gap-1">
                  {accepting && <Spinner data-icon="inline-start" />} Accept Internship Offer 🎉
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Accepted status banner */}
        {app.status === "accepted" && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50/50 dark:border-green-800/30 dark:bg-green-950/20 text-xs text-green-900 dark:text-green-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">Offer Accepted & Onboarded</span>
                {app.joiningFeePaymentId && (
                  <p className="text-muted-foreground mt-0.5">Joining Fee Payment ID: <code className="font-mono text-[11px]">{app.joiningFeePaymentId}</code></p>
                )}
              </div>
            </div>

            {app.offerLetterUrl && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={app.offerLetterUrl} target="_blank" rel="noopener noreferrer" />} className="h-8 text-xs gap-1 bg-white dark:bg-background">
                <Award className="size-3.5 text-primary" /> Offer Letter PDF
              </Button>
            )}
          </div>
        )}

        {/* Tasks Section */}
        {app.status === "accepted" && (
          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-sm">
                <ClipboardList className="size-4 text-primary" />
                Internship Tasks & Deliverables ({app.tasks.length})
              </span>

              {app.tasks.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setExpanded((e) => !e)}>
                  {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  {expanded ? "Hide Tasks" : "Show Tasks"}
                </Button>
              )}
            </div>

            {app.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Your hiring manager will assign tasks here. Check back soon!
              </p>
            ) : expanded && (
              <div className="flex flex-col gap-3">
                {app.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onSubmit={() => { setActiveTask(task); setSubmitOpen(true) }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            {app.resumeUrl && (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" />} className="h-8 text-xs gap-1">
                <FileText className="size-3.5 text-primary" /> Submitted Resume
              </Button>
            )}
          </div>

          {app.internship && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" nativeButton={false} render={<Link href={`/careers/${app.internshipId}`} />}>
              View Position Details <ExternalLink className="size-3" />
            </Button>
          )}
        </div>
      </CardContent>

      {/* Task submission dialog */}
      {activeTask && (
        <TaskSubmitDialog
          task={activeTask}
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          onSubmitted={() => { setSubmitOpen(false); onRefresh() }}
        />
      )}
    </Card>
  )
}

// ─── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onSubmit }: { task: InternshipTask; onSubmit: () => void }) {
  const deadline = task.deadline ? new Date(task.deadline) : null
  const isOverdue = deadline && deadline < new Date() && task.status === "pending"

  const statusBadge = {
    pending:   <Badge variant="secondary" className="text-xs gap-1"><Clock className="size-3" />Pending</Badge>,
    submitted: <Badge className="text-xs bg-blue-600 text-white gap-1"><Send className="size-3" />Submitted</Badge>,
    approved:  <Badge className="text-xs bg-green-600 text-white gap-1"><CheckCircle2 className="size-3" />Approved</Badge>,
    rejected:  <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="size-3" />Revision needed</Badge>,
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{task.title}</p>
        {statusBadge[task.status as keyof typeof statusBadge] ?? statusBadge.pending}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
      )}

      {deadline && (
        <p className={`text-xs font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
          {isOverdue ? "⚠ Overdue — " : "Deadline: "}
          {deadline.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}

      {task.adminFeedback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
          <span className="font-bold">Manager Feedback: </span>{task.adminFeedback}
        </div>
      )}

      {(task.status === "pending" || task.status === "rejected") && (
        <Button size="sm" variant="outline" className="w-fit h-8 text-xs gap-1 mt-1" onClick={onSubmit}>
          <Send className="size-3 text-primary" /> Submit Work / Solution
        </Button>
      )}
    </div>
  )
}

// ─── Task Submit Dialog ────────────────────────────────────────────────────────

function TaskSubmitDialog({ task, open, onOpenChange, onSubmitted }: {
  task: InternshipTask; open: boolean; onOpenChange: (v: boolean) => void; onSubmitted: () => void
}) {
  const [note, setNote]       = useState("")
  const [url, setUrl]         = useState("")
  const [saving, setSaving]   = useState(false)

  useEffect(() => { if (open) { setNote(""); setUrl("") } }, [open])

  async function handleSubmit() {
    if (!note.trim() && !url.trim()) { toast.error("Please add notes or a link to submit work."); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/my-internships/tasks/${task.id}/submit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ submissionNote: note, submissionUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to submit."); return }
      toast.success("Task submitted successfully!")
      onSubmitted()
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Task Deliverable</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground font-semibold">{task.title}</p>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Notes / Summary of Work</FieldLabel>
            <Textarea
              rows={4}
              placeholder="Describe what you built, features completed, or notes for review..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Submission Link <span className="text-muted-foreground text-xs">(GitHub repository, Figma, or Drive URL)</span></FieldLabel>
            <Input
              placeholder="https://github.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />} Submit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
