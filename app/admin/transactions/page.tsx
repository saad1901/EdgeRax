"use client"

import { useEffect, useState } from "react"
import {
  Search, Trash2, IndianRupee, Users, BookOpen,
  Share2, GraduationCap, PieChart, AlertTriangle, Receipt, Tag,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Allocation {
  type: string
  referenceName: string
  percentage: number
  amount: number
}

interface Transaction {
  id: string
  purchasedAt: string
  amount: number
  paymentId: string
  expiresAt: string | null
  couponDiscount: number | null
  student: { id: string; name: string; email: string }
  course:  { id: string; title: string; originalPrice: number | null }
  allocations: Allocation[]
  referral: {
    referrerId:   string
    referrerName: string
    amount:       number
    status:       string
  } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function paymentLabel(paymentId: string) {
  if (paymentId === "giveaway")     return { label: "Free / Giveaway",   variant: "secondary" as const }
  if (paymentId === "cash-offline") return { label: "Cash (offline)",    variant: "secondary" as const }
  return { label: paymentId, variant: "outline" as const }
}

function typeIcon(type: string) {
  if (type === "instructor") return <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
  if (type === "share")      return <PieChart      className="size-3.5 shrink-0 text-muted-foreground" />
  return <IndianRupee className="size-3.5 shrink-0 text-muted-foreground" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [query,        setQuery]        = useState("")
  const [deleting,     setDeleting]     = useState<Transaction | null>(null)
  const [confirming,   setConfirming]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/transactions", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to load transactions."); return }
      setTransactions(data)
    } catch {
      toast.error("Failed to load transactions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = transactions.filter((t) => {
    const q = query.toLowerCase()
    return (
      t.student.name.toLowerCase().includes(q) ||
      t.student.email.toLowerCase().includes(q) ||
      t.course.title.toLowerCase().includes(q) ||
      t.paymentId.toLowerCase().includes(q)
    )
  })

  async function handleDelete() {
    if (!deleting) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/admin/transactions/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to delete."); return }
      toast.success(`Transaction deleted. ${deleting.student.name} has lost access to "${deleting.course.title}".`)
      setDeleting(null)
      load()
    } catch {
      toast.error("Failed to delete transaction.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Receipt className="size-6" />
              Transactions
            </h1>
            <p className="text-muted-foreground">
              Full history of every course purchase with allocation and referral details.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search student, course, payment ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
            <Receipt className="size-10 opacity-40" />
            <p className="font-medium">{query ? "No transactions match your search." : "No transactions yet."}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((t) => {
              const payment = paymentLabel(t.paymentId)
              return (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* ── Top row: student / course / amount / date ── */}
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        {/* Student */}
                        <div className="flex items-center gap-2">
                          <Users className="size-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{t.student.name}</span>
                          <span className="text-sm text-muted-foreground">{t.student.email}</span>
                        </div>
                        {/* Course */}
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm">{t.course.title}</span>
                        </div>
                        {/* Date + payment ID + coupon */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDate(t.purchasedAt)}</span>
                          <span aria-hidden>·</span>
                          <Badge variant={payment.variant} className="font-mono text-xs px-1.5 py-0">
                            {payment.label}
                          </Badge>
                          {t.couponDiscount != null && t.couponDiscount > 0 && (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/40"
                            >
                              <Tag className="size-3" />
                              Coupon: −{formatPrice(t.couponDiscount)}
                              {t.course.originalPrice != null && (
                                <span className="opacity-70 ml-0.5">
                                  (was {formatPrice(t.course.originalPrice)})
                                </span>
                              )}
                            </Badge>
                          )}
                          {t.expiresAt && (
                            <>
                              <span aria-hidden>·</span>
                              <span>Expires {formatDate(t.expiresAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount + delete */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums">{formatPrice(t.amount)}</p>
                          <p className="text-xs text-muted-foreground">paid</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete transaction"
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* ── Allocations + referral row ── */}
                    {(t.allocations.length > 0 || t.referral) && (
                      <div className="border-t bg-muted/20 px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
                        {/* Allocations — instructor and share cuts only */}
                        {t.allocations.filter((a) => a.type !== "referral").map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            {typeIcon(a.type)}
                            <span className="font-medium">{a.referenceName}</span>
                            <span className="text-muted-foreground">
                              {a.percentage.toFixed(2)}% = {formatPrice(a.amount)}
                            </span>
                          </div>
                        ))}

                        {/* Referral */}
                        {t.referral && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Share2 className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">Referred by</span>
                            <span className="font-medium">{t.referral.referrerName}</span>
                            <span className="text-muted-foreground">
                              = {formatPrice(t.referral.amount)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={[
                                "text-xs px-1.5 py-0",
                                t.referral.status === "credited"
                                  ? "text-green-700 dark:text-green-400"
                                  : t.referral.status === "pending"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "",
                              ].join(" ")}
                            >
                              {t.referral.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => { if (!o && !confirming) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Delete this transaction?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>
                  You are about to delete the purchase of{" "}
                  <strong className="text-foreground">"{deleting?.course.title}"</strong> by{" "}
                  <strong className="text-foreground">{deleting?.student.name}</strong>.
                </p>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-destructive dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Course access will be revoked immediately.</strong> The student will lose
                    all progress visibility and won't be able to access the course until re-enrolled.
                    Related referral earnings and revenue allocations will also be removed.
                    This action cannot be undone.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirming}
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {confirming ? <Spinner className="mr-2 size-3.5" /> : null}
              Delete &amp; revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  )
}
