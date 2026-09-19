"use client"

import { useEffect, useState } from "react"
import {
  Briefcase, Plus, Search, Users, CheckCircle2, Clock, FileText, ExternalLink,
  Edit, Trash2, Send, AlertCircle, Eye, Calendar, Sparkles, Filter, ChevronRight, Award
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import type { Internship, InternshipApplication, InternshipTask } from "@/lib/internship-types"

export default function AdminCareersPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modals state
  const [createOpen, setCreateOpen]   = useState(false)
  const [editingItem, setEditingItem] = useState<Internship | null>(null)
  const [activeItem, setActiveItem]   = useState<Internship | null>(null)
  const [viewDetailOpen, setViewDetailOpen] = useState(false)

  async function loadInternships() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/internships", { credentials: "include" })
      const data = await res.json()
      setInternships(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Failed to load internships.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInternships()
  }, [])

  const filtered = internships.filter((item) => {
    const q = search.toLowerCase().trim()
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.domain.toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Quick stats
  const totalListings = internships.length
  const openListings = internships.filter((i) => i.status === "open").length
  const totalApps = internships.reduce((sum, i) => sum + (i.applicationCount || 0), 0)

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="size-6 text-primary" /> Careers & Internships
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage internship listings, applications, offer letters, and joining fees.
            </p>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-1.5 size-4" /> Add New Internship
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-xs">Total Listings</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold">{totalListings}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{openListings} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-xs">Applications Received</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-primary">{totalApps}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Across all positions</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-xs">Program Model</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-sm font-semibold text-green-600 flex items-center gap-1.5 mt-1">
                <Sparkles className="size-4" /> Internship First
              </div>
              <p className="text-xs text-muted-foreground">Offer Letter + Joining Fee Automated</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Listings Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8 text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Briefcase className="mx-auto size-12 opacity-30 mb-3" />
            <h3 className="text-lg font-semibold">No internships found</h3>
            <p className="text-sm mt-1">Create your first internship listing to start accepting applicants.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" /> Create Listing
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <InternshipAdminCard
                key={item.id}
                item={item}
                onEdit={() => { setEditingItem(item); setCreateOpen(true) }}
                onManageApplications={() => { setActiveItem(item); setViewDetailOpen(true) }}
                onDelete={() => handleDeleteListing(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <InternshipFormDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditingItem(null) }}
        editingItem={editingItem}
        onSaved={() => { setCreateOpen(false); setEditingItem(null); loadInternships() }}
      />

      {/* Manage Applications & Tasks Modal */}
      {activeItem && (
        <ManageApplicationsModal
          internship={activeItem}
          open={viewDetailOpen}
          onOpenChange={(v) => { setViewDetailOpen(v); if (!v) loadInternships() }}
        />
      )}
    </AdminShell>
  )

  async function handleDeleteListing(id: string) {
    if (!confirm("Are you sure you want to delete this internship listing?")) return
    try {
      const res = await fetch(`/api/admin/internships/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
      toast.success("Internship deleted.")
      loadInternships()
    } catch {
      toast.error("Failed to delete listing.")
    }
  }
}

// ─── Internship Admin Card ───────────────────────────────────────────────────

function InternshipAdminCard({
  item, onEdit, onManageApplications, onDelete
}: {
  item: Internship
  onEdit: () => void
  onManageApplications: () => void
  onDelete: () => void
}) {
  const statusBadge = {
    open:   <Badge className="bg-green-600">Open</Badge>,
    closed: <Badge variant="destructive">Closed</Badge>,
    draft:  <Badge variant="secondary">Draft</Badge>,
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">{item.domain || "General"}</Badge>
          {statusBadge[item.status] ?? statusBadge.open}
        </div>
        <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">{item.shortDescription || item.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
          <div><span className="font-semibold text-foreground">Duration:</span> {item.duration || "Flexible"}</div>
          <div><span className="font-semibold text-foreground">Stipend:</span> {item.stipend || "Unpaid"}</div>
          <div><span className="font-semibold text-foreground">App Fee:</span> {Number(item.applicationFee) > 0 ? formatPrice(Number(item.applicationFee)) : "Free"}</div>
          <div><span className="font-semibold text-foreground">Joining Fee:</span> {Number(item.joiningFee) > 0 ? formatPrice(Number(item.joiningFee)) : "Nil"}</div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
            <Users className="size-3.5" />
            {item.applicationCount || 0} Applicant{(item.applicationCount || 0) !== 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit} title="Edit Listing">
              <Edit className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} title="Delete Listing" className="text-destructive hover:text-destructive">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" className="w-full mt-1 gap-1" onClick={onManageApplications}>
          Manage Applications ({item.applicationCount || 0}) <ChevronRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Create / Edit Dialog ────────────────────────────────────────────────────

function InternshipFormDialog({
  open, onOpenChange, editingItem, onSaved
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingItem: Internship | null
  onSaved: () => void
}) {
  const [title, setTitle]                       = useState("")
  const [domain, setDomain]                     = useState("")
  const [duration, setDuration]                 = useState("")
  const [stipend, setStipend]                   = useState("")
  const [applicationFee, setApplicationFee]     = useState("0")
  const [joiningFee, setJoiningFee]             = useState("0")
  const [seats, setSeats]                       = useState("0")
  const [status, setStatus]                     = useState<"open" | "closed" | "draft">("open")
  const [shortDescription, setShortDescription] = useState("")
  const [description, setDescription]           = useState("")
  const [requirements, setRequirements]         = useState("")
  const [perks, setPerks]                       = useState("")
  const [startDate, setStartDate]               = useState("")
  const [lastDateToApply, setLastDateToApply]   = useState("")
  const [saving, setSaving]                     = useState(false)

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || "")
      setDomain(editingItem.domain || "")
      setDuration(editingItem.duration || "")
      setStipend(editingItem.stipend || "")
      setApplicationFee(String(editingItem.applicationFee || 0))
      setJoiningFee(String(editingItem.joiningFee || 0))
      setSeats(String(editingItem.seats || 0))
      setStatus(editingItem.status || "open")
      setShortDescription(editingItem.shortDescription || "")
      setDescription(editingItem.description || "")
      setRequirements(editingItem.requirements || "")
      try {
        const parsed = JSON.parse(editingItem.perks || "[]")
        setPerks(Array.isArray(parsed) ? parsed.join("\n") : "")
      } catch {
        setPerks(editingItem.perks || "")
      }
      setStartDate(editingItem.startDate ? editingItem.startDate.slice(0, 10) : "")
      setLastDateToApply(editingItem.lastDateToApply ? editingItem.lastDateToApply.slice(0, 10) : "")
    } else {
      setTitle("")
      setDomain("Full Stack Web Dev")
      setDuration("3 Months")
      setStipend("Performance Based")
      setApplicationFee("0")
      setJoiningFee("0")
      setSeats("0")
      setStatus("open")
      setShortDescription("")
      setDescription("")
      setRequirements("")
      setPerks("Certificate of Completion\nReal-World Projects\nIndustry Mentorship")
      setStartDate("")
      setLastDateToApply("")
    }
  }, [editingItem, open])

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title is required."); return }

    setSaving(true)
    try {
      const perkArray = perks.split("\n").map((p) => p.trim()).filter(Boolean)
      const payload = {
        title: title.trim(),
        domain: domain.trim(),
        duration: duration.trim(),
        stipend: stipend.trim(),
        applicationFee: Number(applicationFee) || 0,
        joiningFee: Number(joiningFee) || 0,
        seats: Number(seats) || 0,
        status,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        perks: perkArray,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        lastDateToApply: lastDateToApply ? new Date(lastDateToApply).toISOString() : null,
      }

      const url = editingItem ? `/api/admin/internships/${editingItem.id}` : "/api/admin/internships"
      const method = editingItem ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save."); return }

      toast.success(editingItem ? "Internship updated!" : "Internship created successfully!")
      onSaved()
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Internship Listing" : "Add New Internship"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the internship position. Applicants can apply directly through the careers portal.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Title <span className="text-destructive">*</span></FieldLabel>
              <Input placeholder="e.g. Full Stack Web Development Intern" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>Domain / Category</FieldLabel>
              <Input placeholder="e.g. Web Dev, AI/ML, UI/UX" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field>
              <FieldLabel>Duration</FieldLabel>
              <Input placeholder="e.g. 3 Months" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>Stipend</FieldLabel>
              <Input placeholder="e.g. ₹5,000/mo or Unpaid" value={stipend} onChange={(e) => setStipend(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onValueChange={(val) => val && setStatus(val as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border">
            <Field>
              <FieldLabel className="text-xs">Application Fee (₹)</FieldLabel>
              <Input type="number" placeholder="0 = Free" value={applicationFee} onChange={(e) => setApplicationFee(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Charged at apply time.</p>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold text-primary">Joining Fee (₹)</FieldLabel>
              <Input type="number" placeholder="0 = Free" value={joiningFee} onChange={(e) => setJoiningFee(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Collected when offer is accepted.</p>
            </Field>

            <Field>
              <FieldLabel className="text-xs">Total Seats</FieldLabel>
              <Input type="number" placeholder="0 = Unlimited" value={seats} onChange={(e) => setSeats(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">Available openings.</p>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Start Date</FieldLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Last Date to Apply</FieldLabel>
              <Input type="date" value={lastDateToApply} onChange={(e) => setLastDateToApply(e.target.value)} />
            </Field>
          </div>

          <Field>
            <FieldLabel>Short Summary</FieldLabel>
            <Input placeholder="1-2 line highlight for listing card" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel>Detailed Description</FieldLabel>
            <Textarea rows={3} placeholder="Overview of the internship, role, and learning outcomes..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel>Requirements</FieldLabel>
            <Textarea rows={3} placeholder="Skills needed, education background, tech stack..." value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel>Perks / Benefits <span className="text-xs text-muted-foreground">(One per line)</span></FieldLabel>
            <Textarea rows={3} placeholder="Certificate of Completion&#10;Letter of Recommendation&#10;Flexible Work Hours" value={perks} onChange={(e) => setPerks(e.target.value)} />
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {editingItem ? "Update Listing" : "Create Internship"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Manage Applications Modal ────────────────────────────────────────────────

function ManageApplicationsModal({
  internship, open, onOpenChange
}: {
  internship: Internship
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"applications" | "tasks">("applications")

  // Offer Letter dialog state
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null)
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [adminNote, setAdminNote] = useState("")

  // Task creation state
  const [createTaskOpen, setCreateTaskOpen] = useState(false)

  async function loadDetails() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/internships/${internship.id}`, { credentials: "include" })
      const data = await res.json()
      setDetails(data)
    } catch {
      toast.error("Failed to load applications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadDetails()
  }, [open, internship.id])

  const applications: InternshipApplication[] = details?.applications || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl">{internship.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {applications.length} Application{applications.length !== 1 ? "s" : ""} received &bull; Joining Fee: {Number(internship.joiningFee) > 0 ? formatPrice(Number(internship.joiningFee)) : "Nil"}
              </DialogDescription>
            </div>
            <Badge variant={internship.status === "open" ? "default" : "secondary"}>
              {internship.status.toUpperCase()}
            </Badge>
          </div>

          <div className="flex gap-2 mt-4 border-b">
            <Button
              variant={activeTab === "applications" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("applications")}
            >
              Applications ({applications.length})
            </Button>
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tasks")}
            >
              Tasks & Deliverables
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="size-8 text-primary" /></div>
          ) : activeTab === "applications" ? (
            applications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto size-10 opacity-30 mb-2" />
                <p>No applications received yet for this position.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {applications.map((app) => (
                  <ApplicationAdminRow
                    key={app.id}
                    app={app}
                    internship={internship}
                    onSendOffer={() => { setSelectedApp(app); setAdminNote(app.adminNote || ""); setOfferDialogOpen(true) }}
                    onStatusChange={handleStatusUpdate}
                  />
                ))}
              </div>
            )
          ) : (
            <AdminTasksView
              internshipId={internship.id}
              applications={applications}
              onRefresh={loadDetails}
            />
          )}
        </div>

        {/* Offer Letter Action Modal */}
        {selectedApp && (
          <SendOfferModal
            open={offerDialogOpen}
            onOpenChange={setOfferDialogOpen}
            app={selectedApp}
            internship={internship}
            adminNote={adminNote}
            setAdminNote={setAdminNote}
            onSuccess={() => { setOfferDialogOpen(false); loadDetails() }}
          />
        )}
      </DialogContent>
    </Dialog>
  )

  async function handleStatusUpdate(appId: string, newStatus: string, note?: string) {
    try {
      const res = await fetch(`/api/admin/internships/${internship.id}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus, adminNote: note }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Application updated to ${newStatus}`)
      loadDetails()
    } catch {
      toast.error("Failed to update application.")
    }
  }
}

// ─── Application Admin Row ───────────────────────────────────────────────────

function ApplicationAdminRow({
  app, internship, onSendOffer, onStatusChange
}: {
  app: InternshipApplication
  internship: Internship
  onSendOffer: () => void
  onStatusChange: (appId: string, status: string, note?: string) => void
}) {
  const applicant = app.applicant
  const statusBadge = {
    pending:  <Badge variant="secondary" className="gap-1"><Clock className="size-3" />Pending Review</Badge>,
    offered:  <Badge className="bg-amber-600 text-white gap-1"><Award className="size-3" />Offer Sent</Badge>,
    accepted: <Badge className="bg-green-600 gap-1"><CheckCircle2 className="size-3" />Offer Accepted 🎉</Badge>,
    rejected: <Badge variant="destructive">Rejected</Badge>,
  }

  const joiningFeeVal = Number(internship.joiningFee || 0)

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base">{applicant?.name || "Applicant"}</h4>
            {statusBadge[app.status] ?? statusBadge.pending}
          </div>
          <p className="text-xs text-muted-foreground">{applicant?.email} {applicant?.phone ? `• ${applicant.phone}` : ""}</p>
        </div>

        <div className="text-xs text-muted-foreground sm:text-right">
          <div>Applied: {new Date(app.appliedAt).toLocaleDateString()}</div>
          {Number(app.amount) > 0 && <div className="text-green-600 font-medium">App Fee Paid: {formatPrice(Number(app.amount))}</div>}
        </div>
      </div>

      {/* Cover letter & Resume */}
      <div className="flex flex-col gap-2 text-xs">
        {app.coverLetter && (
          <div className="bg-muted/40 p-2.5 rounded-md text-muted-foreground whitespace-pre-wrap">
            <span className="font-medium text-foreground">Cover Letter: </span>{app.coverLetter}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {app.resumeUrl ? (
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" />} className="h-8 text-xs gap-1">
                <FileText className="size-3.5 text-primary" /> View Resume PDF
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No resume uploaded</span>
            )}

            {app.offerLetterUrl && (
              <Button variant="ghost" size="sm" nativeButton={false} render={<a href={app.offerLetterUrl} target="_blank" rel="noopener noreferrer" />} className="h-8 text-xs gap-1 text-primary">
                <Award className="size-3.5" /> View Generated Offer PDF
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {app.status === "pending" && (
              <>
                <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1" onClick={onSendOffer}>
                  <Send className="size-3" /> Offer Internship
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => onStatusChange(app.id, "rejected")}>
                  Reject
                </Button>
              </>
            )}

            {app.status === "offered" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-600 font-medium">
                  {joiningFeeVal > 0 ? `Awaiting candidate joining fee (${formatPrice(joiningFeeVal)})` : "Awaiting candidate acceptance"}
                </span>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onStatusChange(app.id, "accepted")}>
                  Mark Accepted
                </Button>
              </div>
            )}

            {app.status === "accepted" && (
              <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> Candidate Onboarded
                {app.joiningFeePaymentId && ` (Paid ${formatPrice(app.joiningFeeAmount)})`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Send Offer Modal ────────────────────────────────────────────────────────

function SendOfferModal({
  open, onOpenChange, app, internship, adminNote, setAdminNote, onSuccess
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  app: InternshipApplication
  internship: Internship
  adminNote: string
  setAdminNote: (v: string) => void
  onSuccess: () => void
}) {
  const [sending, setSending] = useState(false)
  const joiningFeeVal = Number(internship.joiningFee || 0)

  async function handleConfirmOffer() {
    setSending(true)
    try {
      const res = await fetch(`/api/admin/internships/${internship.id}/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "offered",
          adminNote,
          sendOfferEmail: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to send offer."); return }

      toast.success("Offer Letter generated & emailed to candidate!")
      onSuccess()
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" /> Offer Internship
          </DialogTitle>
          <DialogDescription>
            Send official Offer Letter to <strong>{app.applicant?.name}</strong> for {internship.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="bg-muted/40 p-3 rounded-lg flex flex-col gap-1 text-xs">
            <div><strong>Role:</strong> {internship.title}</div>
            <div><strong>Duration:</strong> {internship.duration || "Standard"}</div>
            <div><strong>Stipend:</strong> {internship.stipend || "Unpaid"}</div>
            <div>
              <strong>Joining Fee:</strong>{" "}
              {joiningFeeVal > 0 ? (
                <span className="text-amber-600 font-bold">{formatPrice(joiningFeeVal)} (Candidate will pay on dashboard to accept)</span>
              ) : (
                <span className="text-green-600 font-semibold">Nil (Free Joining)</span>
              )}
            </div>
          </div>

          <Field>
            <FieldLabel>Special Note / Instructions <span className="text-xs text-muted-foreground">(Optional)</span></FieldLabel>
            <Textarea
              rows={3}
              placeholder="e.g. Welcome aboard! We are excited to have you join our team..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </Field>

          <p className="text-xs text-muted-foreground">
            Clicking confirm will automatically generate the official PDF Offer Letter and send an email notification to {app.applicant?.email}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirmOffer} disabled={sending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {sending && <Spinner data-icon="inline-start" />}
            Generate & Send Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Admin Tasks View ────────────────────────────────────────────────────────

function AdminTasksView({
  internshipId, applications, onRefresh
}: {
  internshipId: string
  applications: InternshipApplication[]
  onRefresh: () => void
}) {
  const [taskTitle, setTaskTitle]             = useState("")
  const [taskDesc, setTaskDesc]               = useState("")
  const [taskDeadline, setTaskDeadline]       = useState("")
  const [selectedAppId, setSelectedAppId]     = useState("")
  const [creating, setCreating]               = useState(false)

  const acceptedApps = applications.filter((a) => a.status === "accepted" || a.status === "offered")

  async function handleCreateTask() {
    if (!taskTitle.trim() || !selectedAppId) {
      toast.error("Please select an accepted intern and enter task title.")
      return
    }

    setCreating(true)
    try {
      const selectedApp = applications.find((a) => a.id === selectedAppId)
      const res = await fetch("/api/admin/internship-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          applicationId: selectedAppId,
          internshipId,
          userId: selectedApp?.userId,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
        }),
      })

      if (!res.ok) throw new Error()
      toast.success("Task assigned to intern!")
      setTaskTitle("")
      setTaskDesc("")
      setTaskDeadline("")
      onRefresh()
    } catch {
      toast.error("Failed to assign task.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Assign Task Form */}
      <Card className="p-4 bg-muted/20">
        <h4 className="font-semibold text-sm mb-3">Assign New Task to Intern</h4>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="text-xs">Select Intern</FieldLabel>
              <Select value={selectedAppId} onValueChange={(val) => setSelectedAppId(val ?? "")}>
                <SelectTrigger><SelectValue placeholder="Choose accepted intern..." /></SelectTrigger>
                <SelectContent>
                  {acceptedApps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.applicant?.name} ({a.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel className="text-xs">Task Title</FieldLabel>
              <Input placeholder="e.g. Build User Authentication Module" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="text-xs">Deadline</FieldLabel>
              <Input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} />
            </Field>

            <Field>
              <FieldLabel className="text-xs">Task Description & Instructions</FieldLabel>
              <Textarea rows={2} placeholder="Detail requirements, API endpoints, or repository link..." value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
            </Field>
          </div>

          <Button size="sm" onClick={handleCreateTask} disabled={creating} className="w-fit self-end mt-1">
            {creating && <Spinner data-icon="inline-start" />} Assign Task
          </Button>
        </div>
      </Card>

      {/* Task List */}
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-sm">Assigned Tasks ({applications.flatMap(a => (a as any).tasks || []).length})</h4>
        {applications.flatMap(a => (a as any).tasks || []).length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No tasks assigned yet.</p>
        ) : (
          applications.flatMap(a => ((a as any).tasks || []).map((t: InternshipTask) => (
            <Card key={t.id} className="p-3 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{t.title}</span>
                <Badge variant={t.status === "approved" ? "default" : t.status === "submitted" ? "secondary" : "outline"}>
                  {t.status.toUpperCase()}
                </Badge>
              </div>
              {t.description && <p className="text-muted-foreground">{t.description}</p>}
              {t.submissionNote && (
                <div className="bg-blue-50 p-2 rounded border border-blue-200 text-blue-900">
                  <strong>Submission Note:</strong> {t.submissionNote}
                  {t.submissionUrl && (
                    <a href={t.submissionUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline text-blue-700 font-medium">
                      Link
                    </a>
                  )}
                </div>
              )}
            </Card>
          )))
        )}
      </div>
    </div>
  )
}
