"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminCouponsApi, adminApi, type Coupon } from "@/lib/api"
import type { Course } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminCouponsPage() {
  const [coupons, setCoupons]   = useState<Coupon[]>([])
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Coupon | null>(null)
  const [saving, setSaving]     = useState(false)

  // Form state
  const [code,          setCode]          = useState("")
  const [courseId,      setCourseId]      = useState("all")
  const [discountType,  setDiscountType]  = useState<"percent" | "amount">("percent")
  const [discountValue, setDiscountValue] = useState("")
  const [maxUsage,      setMaxUsage]      = useState("0")
  const [expiresAt,     setExpiresAt]     = useState("")
  const [active,        setActive]        = useState(true)

  async function load() {
    try {
      const [c, cs] = await Promise.all([adminCouponsApi.list(), adminApi.listCourses()])
      setCoupons(c)
      setCourses(cs)
    } catch { toast.error("Failed to load coupons.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setCode(""); setCourseId("all"); setDiscountType("percent")
    setDiscountValue(""); setMaxUsage("0"); setExpiresAt(""); setActive(true)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!code.trim()) { toast.error("Coupon code is required."); return }
    if (!discountValue || Number(discountValue) <= 0) { toast.error("Discount value must be greater than 0."); return }
    if (discountType === "percent" && Number(discountValue) > 100) { toast.error("Percent discount can't exceed 100."); return }

    setSaving(true)
    try {
      await adminCouponsApi.create({
        code:          code.trim().toUpperCase(),
        courseId:      courseId === "all" ? null : courseId,
        discountType,
        discountValue: Number(discountValue),
        maxUsage:      Number(maxUsage) || 0,
        expiresAt:     expiresAt || null,
        active,
      })
      toast.success("Coupon created.")
      setFormOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create coupon.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await adminCouponsApi.update(coupon.id, { active: !coupon.active })
      toast.success(coupon.active ? "Coupon deactivated." : "Coupon activated.")
      load()
    } catch { toast.error("Failed to update coupon.") }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await adminCouponsApi.delete(deleting.id)
      toast.success(`Deleted coupon "${deleting.code}".`)
      setDeleting(null)
      load()
    } catch { toast.error("Failed to delete coupon.") }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => toast.success("Code copied!")).catch(() => {})
  }

  function formatDiscount(c: Coupon) {
    return c.discountType === "percent" ? `${c.discountValue}% off` : `${formatPrice(c.discountValue)} off`
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
            <p className="text-muted-foreground">Create and manage discount coupons for your courses.</p>
          </div>
          <Button onClick={openCreate}><Plus data-icon="inline-start" />New coupon</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="hidden sm:table-cell">Usage</TableHead>
                  <TableHead className="hidden lg:table-cell">Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No coupons yet. Create your first one.
                    </TableCell>
                  </TableRow>
                )}
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold tracking-wide">{coupon.code}</span>
                        <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground" aria-label="Copy code">
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {coupon.courseTitle ?? <span className="italic">All courses</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatDiscount(coupon)}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {coupon.usageCount}{coupon.maxUsage > 0 ? ` / ${coupon.maxUsage}` : " / ∞"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                        : <span className="italic">Never</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.active ? "default" : "outline"}>
                        {coupon.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={coupon.active ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(coupon)}>
                          {coupon.active
                            ? <ToggleRight className="text-primary" />
                            : <ToggleLeft className="text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(coupon)}>
                          <Trash2 className="text-destructive" />
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

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create coupon</DialogTitle>
            <DialogDescription>Set up a discount code for one or all courses.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cp-code">Coupon code</FieldLabel>
              <Input id="cp-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER20" className="font-mono tracking-wide uppercase" />
              <p className="mt-1 text-xs text-muted-foreground">Auto-uppercased. Students type this at checkout.</p>
            </Field>

            <Field>
              <FieldLabel>Applies to</FieldLabel>
              <Select value={courseId} onValueChange={(value, _details) => setCourseId(value ?? "all")}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Discount type</FieldLabel>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed amount (₹)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-value">
                  {discountType === "percent" ? "Percent off" : "Amount off (₹)"}
                </FieldLabel>
                <Input id="cp-value" type="number" min={0} max={discountType === "percent" ? 100 : undefined}
                  value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "20" : "500"} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="cp-max">Max usage</FieldLabel>
                <Input id="cp-max" type="number" min={0} value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)} placeholder="0" />
                <p className="mt-1 text-xs text-muted-foreground">0 = unlimited</p>
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-expires">Expires on</FieldLabel>
                <Input id="cp-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Leave blank = never expires</p>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              Create coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Coupon <span className="font-mono font-semibold">{deleting?.code}</span> will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  )
}
