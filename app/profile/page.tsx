"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LogOut, LibraryBig, ShieldCheck, Mail, Copy, Users,
  IndianRupee, Clock, Wallet, Phone, AlertCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import {
  authApi, purchasesApi, coursesApi, referralApi, withdrawalApi,
  type Purchase, type ReferralStats, type WithdrawalRequest,
} from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { formatPrice } from "@/lib/format"
import { initials } from "@/lib/utils"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const { user, ready, refresh } = useSession()
  const [purchases, setPurchases]         = useState<Purchase[]>([])
  const [courses, setCourses]             = useState<Course[]>([])
  const [referral, setReferral]           = useState<ReferralStats | null>(null)
  const [withdrawals, setWithdrawals]     = useState<WithdrawalRequest[]>([])
  const [loading, setLoading]             = useState(true)
  const [origin, setOrigin]               = useState("")
  const [withdrawOpen, setWithdrawOpen]   = useState(false)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  async function loadAll() {
    if (!ready || !user) return
    try {
      const [ps, cs, ref, wds] = await Promise.all([
        purchasesApi.list(),
        coursesApi.list(),
        referralApi.getMyReferral(),
        withdrawalApi.list(),
      ])
      setPurchases(ps); setCourses(cs); setReferral(ref); setWithdrawals(wds)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [ready, user])

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    toast.success("Signed out.")
    router.push("/")
  }

  if (!ready || loading) return <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  if (!user) return null

  const owned = courses.filter((c) => purchases.some((p) => p.courseId === c.id))
  const spent = purchases.reduce((s, p) => s + p.amount, 0)

  // Credited balance minus already-requested amounts
  const creditedTotal = referral?.earnings
    .filter((e) => e.status === "credited")
    .reduce((s, e) => s + e.amount, 0) ?? 0
  const requestedTotal = withdrawals
    .filter((w) => w.status === "pending" || w.status === "paid")
    .reduce((s, w) => s + w.amount, 0)
  const availableBalance = Math.max(0, creditedTotal - requestedTotal)

  return (
    <AppShell>
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

        {/* User card */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:text-left">
            <Avatar className="size-20 text-xl">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                {user.role === "admin" && (
                  <Badge className="gap-1"><ShieldCheck className="size-3" />Admin</Badge>
                )}
              </div>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <Mail className="size-3.5" />{user.email}
              </p>
              {user.phone && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                  <Phone className="size-3.5" />{user.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Enrolled courses</CardDescription>
              <CardTitle className="text-3xl">{owned.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total invested</CardDescription>
              <CardTitle className="text-3xl">{formatPrice(spent)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Referral Section */}
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />Refer & Earn
              </CardTitle>
              <CardDescription>
                Share your referral link. When someone buys using it, you earn a reward.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total referrals</p>
                  <p className="text-2xl font-bold">{referral.totalReferrals}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Credited</p>
                  <p className="text-2xl font-bold">{formatPrice(referral.totalEarned)}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pending approval</p>
                  <p className="text-2xl font-bold">{formatPrice(referral.pendingAmount)}</p>
                </div>
              </div>

              {/* Per-course links */}
              {courses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Share course links</p>
                  {courses.map((c) => {
                    const link = `${origin}/courses/${c.id}?ref=${referral.code}`
                    const pct = referral.rewardPercent ?? 0
                    const rewardAmount = Math.round((c.price * pct / 100) * 100) / 100
                    return (
                      <div key={c.id} className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                          {owned.some((o) => o.id === c.id) && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">Owned</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You earn {formatPrice(rewardAmount)} ({pct}% of {formatPrice(c.price)})
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded border bg-background px-2 py-1 font-mono text-xs truncate select-all">{link}</div>
                          <Button size="sm" variant="outline" className="shrink-0 gap-1"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(link); toast.success("Link copied!") }
                              catch { toast.error("Failed to copy.") }
                            }}>
                            <Copy className="size-3.5" />Copy
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Earnings history */}
              {referral.earnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Earning history</p>
                  <div className="flex flex-col gap-2">
                    {referral.earnings.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{e.referredName}</span>
                          {e.courseTitle && <span className="text-xs text-muted-foreground">{e.courseTitle}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatPrice(e.amount)}</span>
                          <Badge variant={e.status === "credited" ? "default" : e.status === "rejected" ? "destructive" : "secondary"} className="gap-1 text-xs">
                            {e.status === "pending"  && <Clock className="size-3" />}
                            {e.status === "credited" && <IndianRupee className="size-3" />}
                            {e.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Section */}
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5" />Withdraw Earnings
              </CardTitle>
              <CardDescription>
                Request a payout of your credited referral balance to your UPI ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Available to withdraw</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(availableBalance)}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total withdrawn</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + w.amount, 0))}
                  </p>
                </div>
              </div>

              {availableBalance > 0 ? (
                <Button className="w-fit gap-1.5" onClick={() => setWithdrawOpen(true)}>
                  <Wallet className="size-4" />Request withdrawal
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No balance available. Earn credits by referring new students.
                </p>
              )}

              {/* Withdrawal history */}
              {withdrawals.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Withdrawal history</p>
                    <Link href="/profile/receipts" className="text-sm text-primary underline">View receipts</Link>
                  </div>
                  <div className="flex flex-col gap-2">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{formatPrice(w.amount)}</span>
                          <span className="text-xs text-muted-foreground font-mono">{w.upiId}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} className="gap-1 text-xs">
                            {w.status === "pending"  && <Clock className="size-3" />}
                            {w.status === "paid"     && <IndianRupee className="size-3" />}
                            {w.status}
                          </Badge>
                          {w.note && <span className="text-xs text-muted-foreground max-w-32 text-right">{w.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction history */}
        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <CardTitle>Transaction history</CardTitle>
            <div className="text-sm text-muted-foreground">
              {purchases.length} transaction{purchases.length !== 1 ? "s" : ""}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {purchases.length === 0 && <p className="text-sm text-muted-foreground">No purchases yet.</p>}
            {purchases.map((p) => {
              const course = courses.find((c) => c.id === p.courseId)
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{course?.title ?? "Course purchase"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.purchasedAt).toLocaleDateString()} · {p.paymentId}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatPrice(p.amount)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Transaction ID:</span>
                    <span className="font-mono truncate max-w-[14rem]" title={p.id}>{p.id}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Separator />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" nativeButton={false} render={<Link href="/my-courses" />}>
            <LibraryBig data-icon="inline-start" />My Courses
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />Log out
          </Button>
        </div>
      </div>

      {/* Withdrawal dialog */}
      <WithdrawalDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalance={availableBalance}
        onRequested={loadAll}
      />
    </AppShell>
  )
}

// ─── Withdrawal Request Dialog ────────────────────────────────────────────────

function WithdrawalDialog({
  open, onOpenChange, availableBalance, onRequested,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  availableBalance: number
  onRequested: () => void
}) {
  const [upiId, setUpiId]   = useState("")
  const [amount, setAmount] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setUpiId(""); setAmount(String(availableBalance)) }
  }, [open, availableBalance])

  async function handleSubmit() {
    if (!upiId.trim() || !upiId.includes("@")) {
      toast.error("Enter a valid UPI ID (e.g. name@upi).")
      return
    }
    const amt = Number(amount)
    if (!amount || isNaN(amt) || amt < 1) {
      toast.error("Enter a valid amount.")
      return
    }
    if (amt > availableBalance) {
      toast.error(`Max available: ${formatPrice(availableBalance)}`)
      return
    }
    setSaving(true)
    try {
      await withdrawalApi.request(amt, upiId.trim())
      toast.success("Withdrawal request submitted! Admin will process it shortly.")
      onOpenChange(false)
      onRequested()
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit request.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />Request Withdrawal
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Available balance: </span>
          <span className="font-bold text-green-700 dark:text-green-400">{formatPrice(availableBalance)}</span>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wd-upi">UPI ID</FieldLabel>
            <Input
              id="wd-upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">Money will be sent to this UPI ID.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="wd-amount">Amount (₹)</FieldLabel>
            <Input
              id="wd-amount"
              type="number"
              min={1}
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          Payouts are processed manually by admin. Typically within 2–3 business days.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
