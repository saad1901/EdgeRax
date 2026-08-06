"use client"

import { useEffect, useState } from "react"
import {
  UserPlus, GraduationCap, Pencil, KeyRound,
  Trash2, BookOpen, AlertTriangle, Save,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminApi, type AdminInstructor } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockedCourse { id: string; title: string }

// Shared form state shape used for both create & edit
interface InstructorForm {
  name: string
  email: string
  phone: string
  password: string
  commissionPercent: string
  upiId: string
  degree: string
  organization: string
  bio: string
}

const emptyForm = (): InstructorForm => ({
  name: "", email: "", phone: "", password: "",
  commissionPercent: "", upiId: "", degree: "", organization: "", bio: "",
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<InstructorForm>(emptyForm())

  // Edit dialog
  const [editTarget, setEditTarget] = useState<AdminInstructor | null>(null)
  const [editForm,   setEditForm]   = useState<InstructorForm>(emptyForm())

  // Delete flow
  const [deleteTarget,      setDeleteTarget]      = useState<AdminInstructor | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)   // simple confirm (no courses)
  const [blockerOpen,       setBlockerOpen]        = useState(false)   // courses-assigned blocker
  const [blockedCourses,    setBlockedCourses]     = useState<BlockedCourse[]>([])
  const [replacementId,     setReplacementId]      = useState("")

  async function load() {
    try { setInstructors(await adminApi.listInstructors()) }
    catch { toast.error("Failed to load instructors.") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ── Create ──────────────────────────────────────────────────────────────────

  function openCreate() { setCreateForm(emptyForm()); setCreateOpen(true) }

  async function handleCreate() {
    const commission = Number(createForm.commissionPercent)
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error("Name, email, and password are required."); return
    }
    if (createForm.password.length < 6) {
      toast.error("Password must be at least 6 characters."); return
    }
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("Commission must be between 0 and 100."); return
    }
    setSaving(true)
    try {
      await adminApi.createInstructor({
        name: createForm.name.trim(), email: createForm.email.trim(),
        phone: createForm.phone.trim(), password: createForm.password,
        commissionPercent: commission, upiId: createForm.upiId.trim(),
        degree: createForm.degree.trim(), organization: createForm.organization.trim(),
        bio: createForm.bio.trim(),
      })
      toast.success("Instructor created.")
      setCreateOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create instructor.")
    } finally { setSaving(false) }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(inst: AdminInstructor) {
    setEditTarget(inst)
    setEditForm({
      name:              inst.name,
      email:             inst.email,
      phone:             inst.phone ?? "",
      password:          "",                          // blank = don't change
      commissionPercent: String(inst.commissionPercent ?? 0),
      upiId:             inst.upiId ?? "",
      degree:            inst.degree ?? "",
      organization:      inst.organization ?? "",
      bio:               inst.bio ?? "",
    })
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    const commission = Number(editForm.commissionPercent)
    if (!editForm.name.trim()) { toast.error("Name is required."); return }
    if (!editForm.email.trim()) { toast.error("Email is required."); return }
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("Commission must be between 0 and 100."); return
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("Password must be at least 6 characters."); return
    }

    setSaving(true)
    try {
      const body: Record<string, any> = {
        name:              editForm.name.trim(),
        email:             editForm.email.trim(),
        phone:             editForm.phone.trim(),
        commissionPercent: commission,
        upiId:             editForm.upiId.trim(),
        degree:            editForm.degree.trim(),
        organization:      editForm.organization.trim(),
        bio:               editForm.bio.trim(),
      }
      if (editForm.password) body.password = editForm.password

      const res = await fetch(`/api/admin/instructors/${editTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save."); return }
      toast.success("Instructor updated.")
      setEditTarget(null)
      load()
    } catch {
      toast.error("Failed to save.")
    } finally { setSaving(false) }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function openDelete(inst: AdminInstructor) {
    setDeleteTarget(inst)
    setReplacementId("")
    setBlockedCourses([])
    setDeleteConfirmOpen(true)
  }

  async function executeDelete(replacementInstructorId?: string) {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const body: Record<string, any> = {}
      if (replacementInstructorId) body.replacementInstructorId = replacementInstructorId

      const res = await fetch(`/api/admin/instructors/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        // The instructor has courses — show the blocker dialog
        if (data.requiresReplacement) {
          setBlockedCourses(data.courses ?? [])
          setDeleteConfirmOpen(false)
          setBlockerOpen(true)
          return
        }
        toast.error(data.error ?? "Failed to delete.")
        return
      }

      toast.success(`Deleted "${deleteTarget.name}".`)
      setDeleteConfirmOpen(false)
      setBlockerOpen(false)
      setDeleteTarget(null)
      load()
    } catch {
      toast.error("Failed to delete.")
    } finally { setDeleting(false) }
  }

  // Replacement options = all instructors except the one being deleted
  const replacementOptions = instructors.filter((i) => i.id !== deleteTarget?.id)

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Instructors</h1>
            <p className="text-muted-foreground">Manage instructor accounts and their commission rates.</p>
          </div>
          <Button onClick={openCreate}><UserPlus data-icon="inline-start" />New instructor</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : instructors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <GraduationCap className="size-12 text-muted-foreground" />
              <p className="font-semibold">No instructors yet</p>
              <p className="text-sm text-muted-foreground">Create your first instructor account to get started.</p>
              <Button onClick={openCreate}><UserPlus data-icon="inline-start" />New instructor</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instructor</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{inst.name}</p>
                          {(inst.degree || inst.organization) && (
                            <p className="text-xs italic text-muted-foreground truncate">
                              {[inst.degree, inst.organization].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{inst.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{inst.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{Number(inst.commissionPercent ?? 0)}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit instructor"
                          onClick={() => openEdit(inst)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete instructor"
                          onClick={() => openDelete(inst)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* ── Create instructor dialog ── */}
      <InstructorFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New instructor"
        description="Create a login account and fill in the instructor's public profile."
        form={createForm}
        setForm={setCreateForm}
        saving={saving}
        submitLabel="Create instructor"
        onSubmit={handleCreate}
        showPasswordRequired
      />

      {/* ── Edit instructor dialog ── */}
      {editTarget && (
        <InstructorFormDialog
          open={Boolean(editTarget)}
          onOpenChange={(o) => { if (!o) setEditTarget(null) }}
          title={`Edit — ${editTarget.name}`}
          description="Update instructor details. Leave the password field blank to keep the current password."
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          submitLabel="Save changes"
          onSubmit={handleSaveEdit}
          showPasswordRequired={false}
        />
      )}

      {/* ── Simple delete confirmation (no courses) ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(o) => { if (!o) setDeleteConfirmOpen(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this instructor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>'s account.
              If they have courses assigned, you'll be asked to reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => executeDelete()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Spinner className="mr-2 size-3.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Courses-assigned blocker dialog ── */}
      <Dialog open={blockerOpen} onOpenChange={(o) => { if (!o) setBlockerOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Instructor has courses assigned
            </DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> is assigned to{" "}
              {blockedCourses.length} course{blockedCourses.length !== 1 ? "s" : ""}.
              You must reassign them to another instructor before deleting this account.
            </DialogDescription>
          </DialogHeader>

          {/* Course list */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {blockedCourses.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                <span>{c.title}</span>
              </div>
            ))}
          </div>

          {/* Replacement selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reassign courses to</label>
            {replacementOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other instructors available. Create another instructor first.
              </p>
            ) : (
              <Select value={replacementId} onValueChange={(v) => setReplacementId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a replacement instructor…" />
                </SelectTrigger>
                <SelectContent>
                  {replacementOptions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              All courses will be transferred to the selected instructor, then{" "}
              <strong>{deleteTarget?.name}</strong>'s account will be deleted.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockerOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting || !replacementId}
              onClick={() => executeDelete(replacementId)}
            >
              {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              Reassign &amp; delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

// ─── Shared create / edit form dialog ────────────────────────────────────────

interface FormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  form: InstructorForm
  setForm: React.Dispatch<React.SetStateAction<InstructorForm>>
  saving: boolean
  submitLabel: string
  onSubmit: () => void
  showPasswordRequired: boolean
}

function InstructorFormDialog({
  open, onOpenChange, title, description,
  form, setForm, saving, submitLabel, onSubmit, showPasswordRequired,
}: FormDialogProps) {
  function set(key: keyof InstructorForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
          <Field>
            <FieldLabel htmlFor="if-name">Full name</FieldLabel>
            <Input id="if-name" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
          </Field>
          <Field>
            <FieldLabel htmlFor="if-email">Email</FieldLabel>
            <Input id="if-email" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="if-phone">Phone <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input id="if-phone" value={form.phone} onChange={set("phone")} placeholder="+91 00000 00000" />
            </Field>
            <Field>
              <FieldLabel htmlFor="if-upi">UPI ID <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input id="if-upi" value={form.upiId} onChange={set("upiId")} placeholder="jane@upi" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="if-commission">Commission %</FieldLabel>
              <Input id="if-commission" type="number" min={0} max={100}
                value={form.commissionPercent} onChange={set("commissionPercent")} placeholder="10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="if-password">
                Password{" "}
                {!showPasswordRequired && (
                  <span className="text-muted-foreground">(leave blank to keep)</span>
                )}
              </FieldLabel>
              <Input id="if-password" type="password" value={form.password} onChange={set("password")}
                placeholder={showPasswordRequired ? "Min. 6 characters" : "New password…"} />
            </Field>
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public profile</p>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="if-degree">Degree <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input id="if-degree" value={form.degree} onChange={set("degree")} placeholder="B.Tech, MBA, PhD…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="if-org">Organization <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Input id="if-org" value={form.organization} onChange={set("organization")} placeholder="IIT Delhi, Google…" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="if-bio">Bio <span className="text-muted-foreground">(optional)</span></FieldLabel>
            <Textarea id="if-bio" rows={3} value={form.bio} onChange={set("bio")}
              placeholder="A short professional bio shown on course pages…" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving
              ? <Spinner data-icon="inline-start" />
              : <Save data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
