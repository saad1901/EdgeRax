"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LogOut, LibraryBig, ShieldCheck, Mail, Copy, Users,
  IndianRupee, Clock, Wallet, Phone, AlertCircle, TrendingUp,
  BookOpen, ChevronRight, Receipt,
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
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const { user, ready, refresh } = useSession()
  const [purchases, setPurchases]     = useState<Purchase[]>([])
  const [courses, setCourses]         = useState<Course[]>([])
  const [referral, setReferral]       = useState<ReferralStats | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading]         = useState(true)
  const [origin, setOrigin]           = useState("")
  const [withdrawOpen, setWithdrawOpen] = useState(false)

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

  if (!ready || loading) return (
    <AppShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AppShell>
  )
  if (!user) return null

  const owned = courses.filter((c) => purchases.some((p) => p.courseId === c.id))
  const spent = purchases.reduce((s, p) => s + p.amount, 0)

  const creditedTotal = referral?.earnings
    .filter((e) => e.status === "credited")
    .reduce((s, e) => s + e.amount, 0) ?? 0
  const requestedTotal = withdrawals
    .filter((w) => w.status === "pending" || w.status === "paid")
    .reduce((s, w) => s + w.amount, 0)
  const availableBalance = Math.max(0, creditedTotal - requestedTotal)

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl flex flex-col gap-6">

        {/* ── Profile hero card ── */}
        <Card className="overflow-hidden p-0">
          <div className="h-20 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40" />
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between gap-4 -mt-10">
              <Avatar className="size-20 border-4 border-card text-xl shadow-md">
                <AvatarFallback className="text-xl font-bold">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 pb-1">
                {user.role === "admin" && (
                  <Badge className="gap-1"><ShieldCheck className="size-3" />Admin</Badge>
                )}
                {user.role === "instructor" && (
                  <Badge variant="secondary" className="gap-1">Instructor</Badge>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{user.email}</span>
                {user.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{user.phone}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BookOpen,     label: "Courses",    value: owned.length,            color: "text-primary"    },
            { icon: TrendingUp,   label: "Invested",   value: formatPrice(spent),      color: "text-emerald-500"},
            { icon: Users,        label: "Referrals",  value: referral?.totalReferrals ?? 0, color: "text-blue-500" },
            { icon: Wallet,       label: "Balance",    value: formatPrice(availableBalance), color: "text-amber-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 shadow-xs">
              <Icon className={cn("size-4", color)} />
              <p className="text-base font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <Card>
          <CardContent className="p-0 divide-y">
            {[
              { href: "/my-courses",     icon: LibraryBig, label: "My Courses", desc: `${owned.length} enrolled` },
              { href: "/my-internships", icon: Users,      label: "My Internships", desc: "View applications" },
              ...(user.role === "admin"      ? [{ href: "/admin",      icon: ShieldCheck, label: "Admin Panel",      desc: "Manage platform" }] : []),
              ...(user.role === "instructor" ? [{ href: "/instructor", icon: ShieldCheck, label: "Instructor Panel", desc: "Manage courses"  }] : []),
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="size-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* ── Referral ── */}
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4.5" /> Refer &amp; Earn
              </CardTitle>
              <CardDescription>
                Share your link — earn a reward for every student who buys.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Earnings summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total referrals", value: referral.totalReferrals },
                  { label: "Credited",        value: formatPrice(referral.totalEarned) },
                  { label: "Pending",         value: formatPrice(referral.pendingAmount) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-base font-bold">{value}</p>
                  </div>
                ))}
              </div>

              {/* Per-course referral links */}
              {courses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold">Your referral links</p>
                  {courses.map((c) => {
                    const link = `${origin}/courses/${c.id}?ref=${referral.code}`
                    const pct = referral.rewardPercent ?? 0
                    const rewardAmount = Math.round((c.price * pct / 100) * 100) / 100
                    return (
                      <div key={c.id} className="rounded-xl border bg-muted/20 p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                          <span className="shrink-0 text-xs text-primary font-semibold">
                            +{formatPrice(rewardAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 font-mono text-xs truncate select-all text-muted-foreground">
                            {link}
                          </div>
                          <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-8"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(link); toast.success("Link copied!") }
                              catch { toast.error("Failed to copy.") }
                            }}>
                            <Copy className="size-3" />Copy
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
                  <p className="text-sm font-semibold">Earnings history</p>
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {referral.earnings.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm bg-card">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium truncate">{e.referredName}</span>
                          {e.courseTitle && <span className="text-xs text-muted-foreground truncate">{e.courseTitle}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold">{formatPrice(e.amount)}</span>
                          <Badge
                            variant={e.status === "credited" ? "default" : e.status === "rejected" ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5"
                          >
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

        {/* ── Withdrawal ── */}
        {referral && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4.5" /> Withdraw Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(availableBalance)}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total withdrawn</p>
                  <p className="mt-1 text-xl font-bold">
                    {formatPrice(withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + w.amount, 0))}
                  </p>
                </div>
              </div>

              {availableBalance > 0 ? (
                <Button className="w-fit gap-2" onClick={() => setWithdrawOpen(true)}>
                  <Wallet className="size-4" />Request withdrawal
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No balance available. Earn by referring new students.
                </p>
              )}

              {withdrawals.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Withdrawal history</p>
                    <Link href="/profile/receipts" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Receipt className="size-3" /> Receipts
                    </Link>
                  </div>
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-card text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{formatPrice(w.amount)}</span>
                          <span className="text-xs font-mono text-muted-foreground">{w.upiId}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge
                          variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}
                          className="shrink-0 text-[10px]"
                        >
                          {w.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Transactions ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Transaction History</CardTitle>
            <span className="text-sm text-muted-foreground">{purchases.length} purchase{purchases.length !== 1 ? "s" : ""}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-0">
            {purchases.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <div className="divide-y">
                {purchases.map((p) => {
                  const course = courses.find((c) => c.id === p.courseId)
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{course?.title ?? "Course purchase"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.purchasedAt).toLocaleDateString()} · <span className="font-mono">{p.paymentId}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold">{formatPrice(p.amount)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Button
          variant="destructive"
          className="w-fit gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <WithdrawalDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalance={availableBalance}
        onRequested={loadAll}
      />
    </AppShell>
  )
}

// ─── Withdrawal Dialog ───────────────────────────────────────────────────────

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
    if (!amount || isNaN(amt) || amt < 1) { toast.error("Enter a valid amount."); return }
    if (amt > availableBalance) { toast.error(`Max available: ${formatPrice(availableBalance)}`); return }
    setSaving(true)
    try {
      await withdrawalApi.request(amt, upiId.trim())
      toast.success("Withdrawal request submitted!")
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
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Available: </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatPrice(availableBalance)}</span>
        </div>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wd-upi">UPI ID</FieldLabel>
            <Input id="wd-upi" value={upiId} onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi" autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="wd-amount">Amount (₹)</FieldLabel>
            <Input id="wd-amount" type="number" min={1} max={availableBalance}
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </FieldGroup>
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          Payouts are processed manually. Typically within 2–3 business days.
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
