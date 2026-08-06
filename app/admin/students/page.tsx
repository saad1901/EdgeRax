"use client"

import { Fragment, useEffect, useState } from "react"
import {
  Users, ChevronDown, ChevronRight, Gift,
  Search, BookOpen, IndianRupee, Calendar, KeyRound,
  Pencil, Trash2, Save, Share2,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { GiveawayDialog } from "@/components/giveaway-dialog"
import { PasswordChangeDialog } from "@/components/password-change-dialog"
import { adminApi, type AdminStudent } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function AdminStudentsPage() {
  const [students, setStudents]           = useState<AdminStudent[]>([])
  const [loading, setLoading]             = useState(true)
  const [query, setQuery]                 = useState("")
  const [expanded, setExpanded]           = useState<Set<string>>(new Set())
  const [globalReferralPct, setGlobalReferralPct] = useState<number | null>(null)

  // dialogs
  const [giveawayUser,  setGiveawayUser]  = useState<AdminStudent | null>(null)
  const [passwordUser,  setPasswordUser]  = useState<AdminStudent | null>(null)
  const [editingUser,   setEditingUser]   = useState<AdminStudent | null>(null)
  const [deletingUser,  setDeletingUser]  = useState<AdminStudent | null>(null)

  // edit form fields
  const [editName,            setEditName]            = useState("")
  const [editEmail,           setEditEmail]           = useState("")
  const [editPhone,           setEditPhone]           = useState("")
  const [editReferralPercent, setEditReferralPercent] = useState("") // "" = use global

  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const [studs, refSettings] = await Promise.all([
        adminApi.listStudents(),
        fetch("/api/admin/referral-settings", { credentials: "include" }).then((r) => r.json()),
      ])
      setStudents(studs)
      setGlobalReferralPct(Number(refSettings?.rewardPercent ?? 10))
    } catch {
      toast.error("Failed to load data.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase()),
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openEdit(student: AdminStudent) {
    setEditingUser(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setEditPhone(student.phone ?? "")
    // Show override value if set, blank means use global
    setEditReferralPercent(
      student.referralPercent != null ? String(student.referralPercent) : ""
    )
  }

  async function handleSaveEdit() {
    if (!editingUser) return
    if (!editName.trim())  { toast.error("Name is required.");  return }
    if (!editEmail.trim()) { toast.error("Email is required."); return }

    if (editReferralPercent !== "") {
      const pct = Number(editReferralPercent)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error("Referral % must be between 0 and 100."); return
      }
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/students/${editingUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:  editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          // null clears the override; a number sets it
          referralPercent: editReferralPercent === "" ? null : Number(editReferralPercent),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save."); return }
      toast.success("Student updated.")
      setEditingUser(null)
      load()
    } catch {
      toast.error("Failed to save.")
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deletingUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/students/${deletingUser.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to delete."); return }
      toast.success(`Deleted "${deletingUser.name}".`)
      setDeletingUser(null)
      load()
    } catch {
      toast.error("Failed to delete.")
    } finally { setDeleting(false) }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">
              {students.length} registered student{students.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="font-medium">{query ? "No students match your search." : "No students yet."}</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Enrolled</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const open = expanded.has(student.id)
                  const totalSpent = student.enrollments.reduce((s, e) => s + e.amount, 0)

                  return (
                    <Fragment key={student.id}>
                      <TableRow
                        className={cn("cursor-pointer select-none", open && "bg-muted/40")}
                        onClick={() => toggleExpand(student.id)}
                      >
                        <TableCell className="pr-0 text-muted-foreground">
                          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{student.email}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {student.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant="secondary">
                            <BookOpen className="mr-1 size-3" />
                            {student.enrollments.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-sm font-medium">
                          {totalSpent > 0 ? formatPrice(totalSpent) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="Edit student"
                              onClick={() => openEdit(student)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Reset password"
                              onClick={() => setPasswordUser(student)}>
                              <KeyRound className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Grant access"
                              onClick={() => setGiveawayUser(student)}>
                              <Gift className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete student"
                              onClick={() => setDeletingUser(student)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded enrollment list */}
                      {open && (
                        <TableRow key={`${student.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={6} className="bg-muted/20 pb-4 pt-0">
                            {student.enrollments.length === 0 ? (
                              <p className="pl-8 text-sm text-muted-foreground italic">No courses enrolled yet.</p>
                            ) : (
                              <div className="ml-8 mt-2 flex flex-col gap-1">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Enrolled courses
                                </p>
                                {student.enrollments.map((e) => (
                                  <div key={e.purchaseId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                                      <span className="font-medium">{e.courseTitle}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                      {e.paymentId === "giveaway" ? (
                                        <Badge variant="secondary" className="gap-1">
                                          <Gift className="size-3" />Giveaway
                                        </Badge>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <IndianRupee className="size-3" />
                                          {formatPrice(e.amount)}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Calendar className="size-3" />
                                        {new Date(e.purchasedAt).toLocaleDateString(undefined, {
                                          year: "numeric", month: "short", day: "numeric",
                                        })}
                                      </span>
                                      <span className="font-mono opacity-60 truncate max-w-28" title={e.paymentId}>
                                        {e.paymentId}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* ── Edit student dialog ── */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(o) => { if (!o) setEditingUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>Update details for {editingUser?.name}.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
            <Field>
              <FieldLabel htmlFor="s-name">Full name</FieldLabel>
              <Input id="s-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-email">Email</FieldLabel>
              <Input id="s-email" type="email" value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-phone">
                Phone <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input id="s-phone" type="tel" value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91 00000 00000" />
            </Field>

            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral</p>
            <Field>
              <FieldLabel htmlFor="s-referral" className="flex items-center gap-1.5">
                <Share2 className="size-3.5" />
                Referral reward %
              </FieldLabel>
              <Input
                id="s-referral"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={editReferralPercent}
                onChange={(e) => setEditReferralPercent(e.target.value)}
                placeholder={
                  globalReferralPct != null
                    ? `Global default: ${globalReferralPct}%`
                    : "e.g. 15"
                }
              />
              <FieldDescription>
                {editReferralPercent === ""
                  ? `Using global default${globalReferralPct != null ? ` (${globalReferralPct}%)` : ""}. Enter a value to override for this student only.`
                  : `This student earns ${editReferralPercent}% per referral. Clear the field to revert to the global default.`
                }
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete student confirmation ── */}
      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(o) => { if (!o) setDeletingUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingUser?.name}</strong>'s account,
              all their sessions, and enrollment records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Spinner className="mr-2 size-3.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Giveaway dialog ── */}
      {giveawayUser && (
        <GiveawayDialog
          student={giveawayUser}
          open={Boolean(giveawayUser)}
          onOpenChange={(o) => { if (!o) setGiveawayUser(null) }}
          onGranted={load}
        />
      )}

      {/* ── Password reset dialog ── */}
      {passwordUser && (
        <PasswordChangeDialog
          mode="user"
          userId={passwordUser.id}
          userName={passwordUser.name}
          open={Boolean(passwordUser)}
          onOpenChange={(o) => { if (!o) setPasswordUser(null) }}
          onSaved={load}
        />
      )}
    </AdminShell>
  )
}
