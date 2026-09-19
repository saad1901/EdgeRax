"use client"

import { useEffect, useState } from "react"
import {
  Wallet, Plus, Trash2, GraduationCap, PieChart, ShieldCheck,
  IndianRupee, Save, TrendingUp, Clock, CheckCircle2, ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type RecipientType = "instructor" | "share" | "admin"

interface Recipient {
  type:        RecipientType
  id:          string
  name:        string
  designation: string
  earned:      number
  paid:        number
  outstanding: number
}

interface PayoutRecord {
  id:            string
  recipientType: string
  recipientId:   string
  recipientName: string
  amount:        number
  paymentMethod: string
  paymentRef:    string
  note:          string
  paidBy:        string
  paidAt:        string
}

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI", razorpay: "Razorpay", bank: "Bank Transfer", cash: "Cash", other: "Other",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function RecipientIcon({ type, className }: { type: string; className?: string }) {
  if (type === "instructor") return <GraduationCap className={cn("size-4", className)} />
  if (type === "admin")      return <ShieldCheck    className={cn("size-4", className)} />
  return                            <PieChart       className={cn("size-4", className)} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const [recipients,   setRecipients]   = useState<Recipient[]>([])
  const [history,      setHistory]      = useState<PayoutRecord[]>([])
  const [adminOptions, setAdminOptions] = useState<{ type: "admin"; id: string; name: string }[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const [logOpen,      setLogOpen]      = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PayoutRecord | null>(null)

  const [formRecipientId,   setFormRecipientId]   = useState("")
  const [formRecipientType, setFormRecipientType] = useState<RecipientType | "">("")
  const [formAmount,        setFormAmount]        = useState("")
  const [formMethod,        setFormMethod]        = useState("upi")
  const [formRef,           setFormRef]           = useState("")
  const [formNote,          setFormNote]          = useState("")

  // Filter state for Paid tab
  const [filterRecipient, setFilterRecipient] = useState("all")
  const [filterMethod,    setFilterMethod]    = useState("all")

  async function load() {
    setLoading(true)
    try {
      const [payoutsRes, breakdownRes] = await Promise.all([
        fetch("/api/admin/payouts", { credentials: "include" }),
        fetch("/api/admin/revenue-breakdown", { credentials: "include" }),
      ])
      const payoutsData   = await payoutsRes.json()
      const breakdownData = await breakdownRes.json()
      if (!payoutsRes.ok) { toast.error(payoutsData.error ?? "Failed to load."); return }
      setRecipients(payoutsData.recipients ?? [])
      setHistory(payoutsData.history ?? [])
      setAdminOptions(payoutsData.adminOptions ?? [])
      setTotalRevenue(breakdownData.totalRevenue ?? 0)
    } catch { toast.error("Failed to load payouts.") }
    finally  { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openLog(recipient?: Recipient) {
    setFormRecipientId(recipient?.id ?? "")
    setFormRecipientType(recipient?.type ?? "")
    setFormAmount(recipient ? String(Math.max(0, recipient.outstanding)) : "")
    setFormMethod("upi"); setFormRef(""); setFormNote("")
    setLogOpen(true)
  }

  async function handleLog() {
    if (!formRecipientId || !formRecipientType) { toast.error("Select a recipient."); return }
    const amt = Number(formAmount)
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: formRecipientType, recipientId: formRecipientId,
          amount: amt, paymentMethod: formMethod,
          paymentRef: formRef.trim(), note: formNote.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to log."); return }
      toast.success("Payout logged.")
      setLogOpen(false)
      load()
    } catch { toast.error("Failed to log payout.") }
    finally  { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res  = await fetch(`/api/admin/payouts/${deleteTarget.id}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to delete."); return }
      toast.success("Payout record removed.")
      setDeleteTarget(null)
      load()
    } catch { toast.error("Failed to delete.") }
    finally  { setDeleting(false) }
  }

  // ── Computed values ────────────────────────────────────────────────────────
  // totalEarned = sum of all locked allocations (what recipients are owed from transactions)
  const totalAllocated   = recipients.reduce((s, r) => s + r.earned,      0)
  const totalPaid        = recipients.reduce((s, r) => s + r.paid,        0)
  const totalOutstanding = recipients.reduce((s, r) => s + r.outstanding, 0)
  // Platform profit = total revenue minus all allocations (regardless of paid status)
  const platformProfit   = Math.max(0, totalRevenue - totalAllocated)
  const pendingRecipients = recipients.filter((r) => r.outstanding > 0)

  // Filtered paid history
  const filteredHistory = history.filter((p) => {
    const matchR = filterRecipient === "all" || p.recipientId === filterRecipient
    const matchM = filterMethod    === "all" || p.paymentMethod === filterMethod
    return matchR && matchM
  })

  // Recipient selector options
  const recipientOptions = [
    ...recipients.map((r) => ({
      value: `${r.type}::${r.id}`,
      label: `${r.name} (${r.type === "instructor" ? "Instructor" : r.type === "admin" ? "Admin" : r.designation || "Share"})`,
    })),
    ...adminOptions
      .filter((a) => !recipients.some((r) => r.type === "admin" && r.id === a.id))
      .map((a) => ({ value: `admin::${a.id}`, label: `${a.name} (Admin)` })),
  ]

  function onRecipientSelect(value: string | null) {
    if (!value) return
    const [type, id] = value.split("::")
    setFormRecipientType(type as RecipientType)
    setFormRecipientId(id)
    const r = recipients.find((r) => r.id === id && r.type === type)
    if (r && r.outstanding > 0) setFormAmount(String(r.outstanding))
  }

  const formRecipientValue = formRecipientId && formRecipientType
    ? `${formRecipientType}::${formRecipientId}` : ""

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Wallet className="size-6" /> Payouts
            </h1>
            <p className="text-muted-foreground">
              Track earnings, outstanding balances, and log payments to instructors and shareholders.
            </p>
          </div>
          <Button onClick={() => openLog()}>
            <Plus data-icon="inline-start" />Log payout
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <>
            {/* ── Platform revenue summary ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard
                icon={<IndianRupee className="size-4 text-muted-foreground" />}
                label="Total Revenue"
                value={formatPrice(totalRevenue)}
              />
              <SummaryCard
                icon={<TrendingUp className="size-4 text-muted-foreground" />}
                label="Total Allocated"
                value={formatPrice(totalAllocated)}
                sublabel="Commissions + shares owed"
              />
              <SummaryCard
                icon={<CheckCircle2 className="size-4 text-green-600" />}
                label="Total Paid Out"
                value={formatPrice(totalPaid)}
                valueClass="text-green-700 dark:text-green-400"
              />
              <SummaryCard
                icon={<Clock className="size-4 text-amber-500" />}
                label="Outstanding"
                value={formatPrice(totalOutstanding)}
                valueClass={totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
                sublabel={totalOutstanding > 0 ? "Unpaid to recipients" : "All settled"}
              />
            </div>

            {/* ── Tabs: Pending | Paid ── */}
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending
                  {pendingRecipients.length > 0 && (
                    <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 px-1.5 py-0 text-xs">
                      {pendingRecipients.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>

              {/* ── Pending tab ── */}
              <TabsContent value="pending" className="mt-4">
                {pendingRecipients.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                    <CheckCircle2 className="size-10 opacity-30 text-green-500" />
                    <p className="font-medium">All settled — no outstanding balances</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y rounded-xl border bg-card overflow-hidden">
                    {pendingRecipients.map((r) => (
                      <div key={`${r.type}-${r.id}`}
                        className="flex items-center gap-4 px-4 py-3.5">
                        {/* Icon */}
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
                          <RecipientIcon type={r.type} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        {/* Name + designation */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.type === "instructor" ? "Instructor" : r.type === "admin" ? "Admin" : r.designation || "Shareholder"}
                          </p>
                        </div>
                        {/* Earned / Paid / Outstanding */}
                        <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-muted-foreground shrink-0">
                          <span>Earned: <span className="font-medium text-foreground">{formatPrice(r.earned)}</span></span>
                          <span>Paid: <span className="font-medium text-green-700 dark:text-green-400">{formatPrice(r.paid)}</span></span>
                        </div>
                        {/* Outstanding amount */}
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatPrice(r.outstanding)}
                          </p>
                          <p className="text-xs text-muted-foreground">due</p>
                        </div>
                        {/* Pay button */}
                        <Button size="sm" variant="outline"
                          className="shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800/40 dark:text-amber-400"
                          onClick={() => openLog(r)}>
                          Pay
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recipients with zero outstanding — settled rows */}
                {recipients.filter((r) => r.outstanding <= 0 && r.earned > 0).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fully settled</p>
                    <div className="flex flex-col divide-y rounded-xl border bg-muted/20 overflow-hidden">
                      {recipients.filter((r) => r.outstanding <= 0 && r.earned > 0).map((r) => (
                        <div key={`${r.type}-${r.id}`} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                            <RecipientIcon type={r.type} className="text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{r.name}</p>
                          </div>
                          <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
                            {formatPrice(r.earned)} paid
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Paid tab ── */}
              <TabsContent value="paid" className="mt-4 flex flex-col gap-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <Select value={filterRecipient} onValueChange={(v) => setFilterRecipient(v ?? "all")}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="All recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All recipients</SelectItem>
                      {[...recipients, ...adminOptions
                        .filter((a) => !recipients.some((r) => r.type === "admin" && r.id === a.id))
                        .map((a) => ({ ...a, earned: 0, paid: 0, outstanding: 0, designation: "Admin" }))
                      ].map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterMethod} onValueChange={(v) => setFilterMethod(v ?? "all")}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All methods</SelectItem>
                      {Object.entries(METHOD_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={() => openLog()}>
                    <Plus className="size-3.5 mr-1" />Log payout
                  </Button>
                </div>

                {/* History rows */}
                {filteredHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No payout records match the selected filters.</p>
                ) : (
                  <div className="flex flex-col divide-y rounded-xl border bg-card overflow-hidden">
                    {filteredHistory.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                          <RecipientIcon type={p.recipientType} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight">{p.recipientName}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                            </Badge>
                            {p.paymentRef && (
                              <span className="font-mono text-xs text-muted-foreground hidden sm:inline">{p.paymentRef}</span>
                            )}
                            {p.note && (
                              <span className="text-xs text-muted-foreground hidden md:inline italic">"{p.note}"</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">by {p.paidBy}</p>
                        </div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums shrink-0">
                          {formatPrice(p.amount)}
                        </p>
                        <Button variant="ghost" size="icon" aria-label="Delete"
                          onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* ── Log payout dialog ── */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a payout</DialogTitle>
            <DialogDescription>Record a payment made to an instructor, shareholder, or admin.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Recipient</FieldLabel>
              <Select value={formRecipientValue} onValueChange={onRecipientSelect}>
                <SelectTrigger><SelectValue placeholder="Select recipient…" /></SelectTrigger>
                <SelectContent>
                  {recipientOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Amount (₹)</FieldLabel>
                <Input type="number" min={1} step={0.01} value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </Field>
              <Field>
                <FieldLabel>Payment method</FieldLabel>
                <Select value={formMethod} onValueChange={(v) => setFormMethod(v ?? "upi")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Reference <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input value={formRef} onChange={(e) => setFormRef(e.target.value)}
                placeholder="UTR / Razorpay ID / reference number" />
              <FieldDescription>Paste the payment reference for your audit trail.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Note <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input value={formNote} onChange={(e) => setFormNote(e.target.value)}
                placeholder="e.g. March 2025 commission" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              Log payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payout record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the log entry for the {formatPrice(deleteTarget?.amount ?? 0)} payment to{" "}
              <strong>{deleteTarget?.recipientName}</strong>. It does not reverse the actual payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? <Spinner className="mr-2 size-3.5" /> : null}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, valueClass, sublabel }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string; sublabel?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={cn("text-xl font-bold tabular-nums", valueClass)}>{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}
