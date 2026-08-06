"use client"

import { useEffect, useState } from "react"
import {
  Users, Settings2, IndianRupee, Clock, CheckCircle2,
  XCircle, RefreshCw, Save, Wallet, Phone, Mail,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import {
  adminApi, type AdminReferralEarning, type ReferralSettings, type AdminWithdrawalRequest,
} from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"

type Tab = "earnings" | "withdrawals" | "settings"

export default function AdminReferralsPage() {
  const [tab, setTab] = useState<Tab>("withdrawals")

  const [referrals, setReferrals]       = useState<AdminReferralEarning[]>([])
  const [withdrawals, setWithdrawals]   = useState<AdminWithdrawalRequest[]>([])
  const [settings, setSettings]         = useState<ReferralSettings | null>(null)
  const [loading, setLoading]           = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Settings form
  const [rewardPercent, setRewardPercent] = useState("")
  const [maxReferrals, setMaxReferrals]   = useState("")
  const [autoCredit, setAutoCredit]       = useState(false)

  // Payout note dialog
  const [noteDialog, setNoteDialog]     = useState<{ id: string; status: "paid" | "rejected" } | null>(null)
  const [noteText, setNoteText]         = useState("")
  const [updatingId, setUpdatingId]     = useState<string | null>(null)

  async function load() {
    try {
      const [refs, wds, cfg] = await Promise.all([
        adminApi.listReferrals(),
        adminApi.listWithdrawals(),
        adminApi.getReferralSettings(),
      ])
      setReferrals(refs)
      setWithdrawals(wds)
      setSettings(cfg)
      setRewardPercent(String(cfg.rewardPercent ?? 10))
      setMaxReferrals(String(cfg.maxReferrals))
      setAutoCredit(Boolean(cfg.autoCredit))
    } catch {
      toast.error("Failed to load referral data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveSettings() {
    const pct = Number(rewardPercent)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Referral percentage must be between 0 and 100.")
      return
    }
    setSavingSettings(true)
    try {
      const updated = await adminApi.updateReferralSettings({
        rewardPercent: Math.round(pct * 100) / 100,
        maxReferrals: Number(maxReferrals) || 0,
        autoCredit,
      })
      setSettings(updated)
      toast.success("Settings saved.")
    } catch {
      toast.error("Failed to save settings.")
    } finally {
      setSavingSettings(false)
    }
  }

  async function updateEarningStatus(id: string, status: "credited" | "rejected" | "pending") {
    try {
      await adminApi.updateReferralStatus(id, status)
      toast.success(`Marked as ${status}.`)
      setReferrals((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
    } catch {
      toast.error("Failed to update status.")
    }
  }

  async function updateWithdrawalStatus(id: string, status: "paid" | "rejected" | "pending", note?: string) {
    setUpdatingId(id)
    try {
      await adminApi.updateWithdrawalStatus(id, status, note)
      toast.success(status === "paid" ? "Marked as paid!" : `Marked as ${status}.`)
      setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, status, note: note ?? w.note } : w))
    } catch {
      toast.error("Failed to update.")
    } finally {
      setUpdatingId(null)
      setNoteDialog(null)
      setNoteText("")
    }
  }

  // Stats
  const pendingWithdrawals  = withdrawals.filter((w) => w.status === "pending")
  const totalPaidOut        = withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + w.amount, 0)
  const totalPendingAmount  = pendingWithdrawals.reduce((s, w) => s + w.amount, 0)
  const totalEarningsCount  = referrals.filter((r) => r.status === "credited").length

  const TABS: { key: Tab; label: string }[] = [
    { key: "withdrawals", label: "Withdrawal Requests" },
    { key: "earnings",    label: "Referral Earnings" },
    { key: "settings",    label: "Settings" },
  ]

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referrals & Payouts</h1>
          <p className="text-muted-foreground">Manage referral earnings and process withdrawal requests.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs">Pending withdrawals</CardDescription>
                  <Wallet className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingWithdrawals.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{formatPrice(totalPendingAmount)} to pay</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs">Total paid out</CardDescription>
                  <IndianRupee className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(totalPaidOut)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs">Total referrals</CardDescription>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{referrals.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-xs">Credited earnings</CardDescription>
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEarningsCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {t.key === "withdrawals" && pendingWithdrawals.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0">
                      {pendingWithdrawals.length}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* ── Withdrawal Requests ── */}
            {tab === "withdrawals" && (
              <Card className="overflow-hidden p-0">
                <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between">
                  <CardTitle>Withdrawal Requests</CardTitle>
                  <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="size-4" /></Button>
                </CardHeader>
                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                    <Wallet className="size-10 opacity-40" />
                    <p className="font-medium">No withdrawal requests yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>UPI ID</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <p className="font-medium">{w.userName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="size-3" />{w.userEmail}
                            </p>
                            {w.userPhone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="size-3" />{w.userPhone}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm select-all">{w.upiId}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString(undefined, {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-base">
                            {formatPrice(w.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}
                                className="gap-1"
                              >
                                {w.status === "pending"  && <Clock className="size-3" />}
                                {w.status === "paid"     && <CheckCircle2 className="size-3" />}
                                {w.status === "rejected" && <XCircle className="size-3" />}
                                {w.status}
                              </Badge>
                              {w.note && <span className="text-xs text-muted-foreground max-w-24 text-center">{w.note}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {w.status !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                  disabled={updatingId === w.id}
                                  onClick={() => { setNoteDialog({ id: w.id, status: "paid" }); setNoteText("") }}
                                >
                                  {updatingId === w.id ? <Spinner className="size-3" /> : <CheckCircle2 className="size-3" />}
                                  Mark paid
                                </Button>
                              )}
                              {w.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  disabled={updatingId === w.id}
                                  onClick={() => { setNoteDialog({ id: w.id, status: "rejected" }); setNoteText("") }}
                                >
                                  <XCircle className="size-3 text-destructive" />Reject
                                </Button>
                              )}
                              {w.status !== "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs"
                                  disabled={updatingId === w.id}
                                  onClick={() => updateWithdrawalStatus(w.id, "pending")}
                                >
                                  <Clock className="size-3" />Reset
                                </Button>
                              )}
                              {w.receiptId && (
                                <div className="flex items-center gap-1">
                                  <a href={`/receipts/${w.receiptId}`}>
                                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                      View
                                    </Button>
                                  </a>
                                  <a href={`/api/receipts/${w.receiptId}`} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                      Download
                                    </Button>
                                  </a>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}

            {/* ── Referral Earnings ── */}
            {tab === "earnings" && (
              <Card className="overflow-hidden p-0">
                <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between">
                  <CardTitle>All Referral Earnings</CardTitle>
                  <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="size-4" /></Button>
                </CardHeader>
                {referrals.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                    <Users className="size-10 opacity-40" />
                    <p className="font-medium">No referrals yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Referred user</TableHead>
                        <TableHead className="hidden lg:table-cell">Course</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="font-medium">{r.referrerName}</p>
                            <p className="text-xs text-muted-foreground">{r.referrerEmail}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{r.referredName}</p>
                            <p className="text-xs text-muted-foreground">{r.referredEmail}</p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-40 truncate">
                            {r.courseTitle}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatPrice(r.amount)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={r.status === "credited" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="gap-1">
                              {r.status === "pending"  && <Clock className="size-3" />}
                              {r.status === "credited" && <CheckCircle2 className="size-3" />}
                              {r.status === "rejected" && <XCircle className="size-3" />}
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.status !== "credited" && (
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                                  onClick={() => updateEarningStatus(r.id, "credited")}>
                                  <CheckCircle2 className="size-3 text-green-600" />Credit
                                </Button>
                              )}
                              {r.status !== "rejected" && (
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                                  onClick={() => updateEarningStatus(r.id, "rejected")}>
                                  <XCircle className="size-3 text-destructive" />Reject
                                </Button>
                              )}
                              {r.status !== "pending" && (
                                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                                  onClick={() => updateEarningStatus(r.id, "pending")}>
                                  <Clock className="size-3" />Pending
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}

            {/* ── Settings ── */}
            {tab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="size-5" />Referral settings
                  </CardTitle>
                  <CardDescription>
                    Configure reward amounts and approval mode.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="reward-percent">Default Referral Percentage (%)</Label>
                      <div className="relative">
                        <Input
                          id="reward-percent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="10"
                          value={rewardPercent}
                          onChange={(e) => setRewardPercent(e.target.value)}
                          className="pr-8"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reward will be calculated as a percentage of the purchased course price.
                      </p>
                      {rewardPercent !== "" && (
                        <p className="text-xs text-primary font-medium">
                          Example: ₹1000 course → ₹{(Math.round(Number(rewardPercent) * 10) / 1).toFixed(2)} reward
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="max-referrals">Max referrals per user</Label>
                      <Input id="max-referrals" type="number" min="0" placeholder="0"
                        value={maxReferrals} onChange={(e) => setMaxReferrals(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Set to 0 for unlimited.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Auto-credit rewards</Label>
                      <div className="flex items-center gap-3 pt-2">
                        <Switch checked={autoCredit} onCheckedChange={setAutoCredit} id="auto-credit" />
                        <Label htmlFor="auto-credit" className="font-normal cursor-pointer">
                          {autoCredit ? "Enabled — auto credited on purchase" : "Disabled — manual approval"}
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button onClick={saveSettings} disabled={savingSettings}>
                      {savingSettings ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                      Save settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Note dialog for paid / rejected */}
      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setNoteText("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.status === "paid" ? "Mark as Paid" : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="note-input">
              {noteDialog?.status === "paid" ? "Transaction note (optional)" : "Rejection reason (optional)"}
            </FieldLabel>
            <Input
              id="note-input"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={noteDialog?.status === "paid" ? "e.g. Paid via UPI ref #12345" : "e.g. Invalid UPI ID"}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteDialog(null); setNoteText("") }}>Cancel</Button>
            <Button
              variant={noteDialog?.status === "rejected" ? "destructive" : "default"}
              onClick={() => noteDialog && updateWithdrawalStatus(noteDialog.id, noteDialog.status, noteText || undefined)}
              disabled={updatingId !== null}
            >
              {updatingId ? <Spinner data-icon="inline-start" /> : null}
              {noteDialog?.status === "paid" ? "Confirm Paid" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
