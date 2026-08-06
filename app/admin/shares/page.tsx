"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Save, PieChart, X } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

interface RevenueShare {
  id: string
  name: string
  designation: string
  percentage: number
  createdAt: string
  updatedAt: string
}

interface ShareForm {
  name: string
  designation: string
  percentage: string
}

const emptyForm = (): ShareForm => ({ name: "", designation: "", percentage: "" })

export default function AdminSharesPage() {
  const [shares,  setShares]  = useState<RevenueShare[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<ShareForm>(emptyForm())

  const [editTarget, setEditTarget] = useState<RevenueShare | null>(null)
  const [editForm,   setEditForm]   = useState<ShareForm>(emptyForm())

  const [deleteTarget, setDeleteTarget] = useState<RevenueShare | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/shares", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to load."); return }
      setShares(data)
    } catch {
      toast.error("Failed to load shares.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const totalPct = shares.reduce((s, r) => s + Number(r.percentage), 0)

  // ── Create ──────────────────────────────────────────────────────────────────

  function openCreate() { setCreateForm(emptyForm()); setCreateOpen(true) }

  async function handleCreate() {
    if (!createForm.name.trim()) { toast.error("Name is required."); return }
    const pct = Number(createForm.percentage)
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Percentage must be 0–100."); return }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/shares", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        createForm.name.trim(),
          designation: createForm.designation.trim(),
          percentage:  pct,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to create."); return }
      toast.success("Share added.")
      setCreateOpen(false)
      load()
    } catch {
      toast.error("Failed to create.")
    } finally { setSaving(false) }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(share: RevenueShare) {
    setEditTarget(share)
    setEditForm({
      name:        share.name,
      designation: share.designation,
      percentage:  String(share.percentage),
    })
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    if (!editForm.name.trim()) { toast.error("Name is required."); return }
    const pct = Number(editForm.percentage)
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Percentage must be 0–100."); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/shares/${editTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        editForm.name.trim(),
          designation: editForm.designation.trim(),
          percentage:  pct,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save."); return }
      toast.success("Share updated.")
      setEditTarget(null)
      load()
    } catch {
      toast.error("Failed to save.")
    } finally { setSaving(false) }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/shares/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to delete."); return }
      toast.success(`Removed "${deleteTarget.name}".`)
      setDeleteTarget(null)
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
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <PieChart className="size-6" />
              Revenue Shares
            </h1>
            <p className="text-muted-foreground">
              Define stakeholders and their percentage share of revenue.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />Add share
          </Button>
        </div>

        {/* Total allocation indicator */}
        {shares.length > 0 && (
          <div className={[
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm w-fit",
            Math.round(totalPct * 100) / 100 === 100
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400",
          ].join(" ")}>
            <PieChart className="size-4 shrink-0" />
            <span>
              Total allocated:{" "}
              <strong>{Math.round(totalPct * 100) / 100}%</strong>
              {Math.round(totalPct * 100) / 100 !== 100 && (
                <span className="ml-1 opacity-75">
                  ({Math.round((100 - totalPct) * 100) / 100}% unallocated)
                </span>
              )}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : shares.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <PieChart className="size-12 text-muted-foreground opacity-40" />
              <p className="font-semibold">No shares defined yet</p>
              <p className="text-sm text-muted-foreground">Add stakeholders and their revenue percentages.</p>
              <Button onClick={openCreate}><Plus data-icon="inline-start" />Add share</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Designation</TableHead>
                  <TableHead className="text-right">Share %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.id}>
                    <TableCell>
                      <p className="font-medium">{share.name}</p>
                      {share.designation && (
                        <p className="text-xs text-muted-foreground sm:hidden">{share.designation}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {share.designation || <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        {Number(share.percentage).toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit"
                          onClick={() => openEdit(share)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete"
                          onClick={() => setDeleteTarget(share)}>
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

      {/* ── Create dialog ── */}
      <ShareFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add share"
        description="Define a stakeholder and their percentage of revenue."
        form={createForm}
        setForm={setCreateForm}
        saving={saving}
        submitLabel="Add share"
        onSubmit={handleCreate}
      />

      {/* ── Edit dialog ── */}
      {editTarget && (
        <ShareFormDialog
          open={Boolean(editTarget)}
          onOpenChange={(o) => { if (!o) setEditTarget(null) }}
          title={`Edit — ${editTarget.name}`}
          description="Update this stakeholder's details."
          form={editForm}
          setForm={setEditForm}
          saving={saving}
          submitLabel="Save changes"
          onSubmit={handleSaveEdit}
        />
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this share?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong>'s share entry.
              This cannot be undone.
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  )
}

// ─── Shared form dialog ───────────────────────────────────────────────────────

interface ShareFormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  form: ShareForm
  setForm: React.Dispatch<React.SetStateAction<ShareForm>>
  saving: boolean
  submitLabel: string
  onSubmit: () => void
}

function ShareFormDialog({
  open, onOpenChange, title, description,
  form, setForm, saving, submitLabel, onSubmit,
}: ShareFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="sf-name">Name</FieldLabel>
            <Input
              id="sf-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Platform, Instructor, Owner"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sf-designation">
              Designation <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="sf-designation"
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
              placeholder="e.g. Co-founder, Lead Instructor"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sf-pct">Percentage (%)</FieldLabel>
            <Input
              id="sf-pct"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.percentage}
              onChange={(e) => setForm((p) => ({ ...p, percentage: e.target.value }))}
              placeholder="e.g. 30"
            />
            <FieldDescription>Between 0 and 100. Two decimal places allowed.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
