"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { adminApi, type AdminInstructor } from "@/lib/api"
import type { Course } from "@/lib/types"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useSession } from "@/lib/session"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
  onSaved: () => void
}

const LEVELS: Course["level"][] = ["Beginner", "Intermediate", "Advanced"]
const STATUSES: { value: Course["status"]; label: string }[] = [
  { value: "upcoming",  label: "Upcoming" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "recorded",  label: "Recorded" },
]

const VALIDITY_OPTIONS = [
  { label: "Lifetime access", value: "" },
  { label: "1 month (30 days)", value: "30" },
  { label: "3 months (90 days)", value: "90" },
  { label: "6 months (180 days)", value: "180" },
  { label: "1 year (365 days)", value: "365" },
  { label: "2 years (730 days)", value: "730" },
  { label: "Custom (days)", value: "custom" },
]

/** Derive the <Select> value from a raw validityDays number. */
function resolveValiditySelect(validityDays: number | null | undefined): string {
  if (validityDays == null) return ""
  return VALIDITY_OPTIONS.find((o) => o.value === String(validityDays)) ? String(validityDays) : "custom"
}

export function CourseFormDialog({ open, onOpenChange, course, onSaved }: Props) {
  const { user } = useSession()
  const editing = Boolean(course)
  const [saving, setSaving] = useState(false)
  const [loadingCourse, setLoadingCourse] = useState(false)
  const [instructors, setInstructors] = useState<AdminInstructor[]>([])

  // Load instructors list (admin only — instructors see only themselves)
  useEffect(() => {
    if (user?.role === "admin") {
      adminApi.listInstructors().then(setInstructors).catch(() => {})
    }
  }, [user?.role])

  // All form fields — populated/reset by the useEffect below
  const [title,            setTitle]            = useState("")
  const [instructor,       setInstructor]       = useState("")
  const [instructorId,     setInstructorId]     = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [description,      setDescription]      = useState("")
  const [price,            setPrice]            = useState("")
  const [originalPrice,    setOriginalPrice]    = useState("")
  const [category,         setCategory]         = useState("")
  const [level,            setLevel]            = useState<Course["level"]>("Beginner")
  const [duration,         setDuration]         = useState("")
  const [thumbnail,        setThumbnail]        = useState("")
  const [thumbnailName,    setThumbnailName]    = useState("")
  const [thumbnailFile,    setThumbnailFile]    = useState<File | null>(null)
  const [uploadingThumb,   setUploadingThumb]   = useState(false)
  const [validitySelect,   setValiditySelect]   = useState("")
  const [customDays,       setCustomDays]       = useState("")
  const [status,           setStatus]           = useState<Course["status"]>("recorded")
  const [startDate,        setStartDate]        = useState("")

  // ── Populate fields whenever the dialog opens or the course changes ─────────
  // This is the critical fix: useState ignores prop updates after first render,
  // so we must explicitly sync via useEffect.
  useEffect(() => {
    if (!open) return

    if (!course) {
      // New course — clear all fields
      setTitle(""); setInstructor(user?.role === "instructor" ? user.name : ""); setShortDescription(""); setDescription("")
      setPrice(""); setOriginalPrice(""); setCategory(""); setLevel("Beginner")
      setDuration(""); setThumbnail(""); setThumbnailName(""); setThumbnailFile(null)
      setValiditySelect(""); setCustomDays("")
      setStatus("recorded"); setStartDate("")
      setInstructorId(user?.role === "instructor" ? user.id : "")
      return
    }

    // Edit mode: fetch the full course from the server to ensure we have
    // the latest data (the list may have stale/partial data)
    setLoadingCourse(true)
    adminApi.getCourse(course.id)
      .then((full) => {
        setTitle(full.title ?? "")
        setInstructor(full.instructor ?? "")
        setInstructorId(full.instructorId ?? "")
        setShortDescription(full.shortDescription ?? "")
        setDescription(full.description ?? "")
        setPrice(full.price != null ? String(full.price) : "")
        setOriginalPrice(full.originalPrice != null ? String(full.originalPrice) : "")
        setCategory(full.category ?? "")
        setLevel(full.level ?? "Beginner")
        setDuration(full.duration ?? "")
        setThumbnail(full.thumbnail ?? "")
        setThumbnailName("") // reset file picker label; preview shown from URL
        setThumbnailFile(null)

        const vs = resolveValiditySelect(full.validityDays)
        setValiditySelect(vs)
        setCustomDays(vs === "custom" && full.validityDays != null ? String(full.validityDays) : "")
        setStatus(full.status ?? "recorded")
        setStartDate(full.startDate ? full.startDate.slice(0, 10) : "")
      })
      .catch(() => toast.error("Failed to load course details."))
      .finally(() => setLoadingCourse(false))
  }, [open, course?.id, user?.name, user?.role]) // re-run when the dialog opens OR a different course is selected

  async function handleThumbnailChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Store the raw file; preview locally with object URL, upload on save
    setThumbnailFile(file)
    setThumbnailName(file.name)
    setThumbnail(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!title.trim() || !price) {
      toast.error("Please fill in the title and price.")
      return
    }
    if (user?.role === "admin" && !instructorId) {
      toast.error("Please select an instructor.")
      return
    }
    if (user?.role === "instructor" && !instructor.trim()) {
      toast.error("Instructor name is missing.")
      return
    }

    // Resolve validityDays
    let validityDays: number | null = null
    if (validitySelect === "custom") {
      const n = Number(customDays)
      if (!customDays || isNaN(n) || n < 1) {
        toast.error("Enter a valid number of days for custom validity.")
        return
      }
      validityDays = n
    } else if (validitySelect !== "") {
      validityDays = Number(validitySelect)
    }

    const payload: Partial<Course> = {
      title:            title.trim(),
      instructor:       instructor.trim(),
      instructorId:     instructorId || null,
      shortDescription: shortDescription.trim(),
      description:      description.trim(),
      price:            Number(price),
      originalPrice:    originalPrice.trim() !== "" ? Number(originalPrice) : null,
      category,
      level,
      duration:         duration.trim() || "Self-paced",
      thumbnail,
      validityDays,
      status,
      startDate:        startDate || null,
    }

    setSaving(true)
    try {
      // If a new image file was selected, upload it to Wasabi first
      let thumbnailUrl = thumbnail
      if (thumbnailFile) {
        setUploadingThumb(true)
        const fd = new FormData()
        fd.append("file", thumbnailFile)
        const res = await fetch("/api/upload/thumbnail", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Thumbnail upload failed.")
        thumbnailUrl = json.url
        setThumbnail(thumbnailUrl)
        setThumbnailFile(null)
        setUploadingThumb(false)
      }

      if (editing && course) {
        await adminApi.updateCourse(course.id, { ...payload, thumbnail: thumbnailUrl })
        toast.success("Course updated.")
      } else {
        await adminApi.createCourse({ ...payload, thumbnail: thumbnailUrl })
        toast.success("Course created.")
      }
      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save course.")
    } finally {
      setSaving(false)
      setUploadingThumb(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "Create course"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the details of this course." : "Add a new course to your catalog."}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state while fetching full course data */}
        {loadingCourse ? (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Spinner className="size-5" />
            <span className="text-sm">Loading course details…</span>
          </div>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="c-title">Title</FieldLabel>
              <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="The Complete Web Developer Course" />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-instructor">Instructor</FieldLabel>
              {user?.role === "admin" ? (
                <>
                  <Select
                    value={instructorId}
                    onValueChange={(v) => {
                      const nextId = v ?? ""
                      setInstructorId(nextId)
                      const picked = instructors.find((i) => i.id === nextId)
                      if (picked) setInstructor(picked.name)
                    }}
                  >
                    <SelectTrigger id="c-instructor">
                      <SelectValue placeholder="Select an instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {instructors.length === 0 && (
                          <SelectItem value="__none" disabled>No instructors found</SelectItem>
                        )}
                        {instructors.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {instructors.length === 0 && (
                    <p className="mt-1 text-xs text-destructive">No instructors exist yet. Add one in the Access page first.</p>
                  )}
                </>
              ) : (
                <Input id="c-instructor" value={instructor} disabled />
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="c-short">Short description</FieldLabel>
              <Input id="c-short" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One-line summary shown on course cards" />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-desc">Full description</FieldLabel>
              <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} placeholder="What students will learn..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="c-price">Discounted price (₹)</FieldLabel>
                <Input id="c-price" type="number" min={0} value={price}
                  onChange={(e) => setPrice(e.target.value)} placeholder="499" />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-original-price">Original / MRP (₹)</FieldLabel>
                <Input id="c-original-price" type="number" min={0} value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)} placeholder="999 (optional)" />
                <p className="mt-1 text-xs text-muted-foreground">Leave blank to show no strikethrough.</p>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="c-category">Category</FieldLabel>
                <Input id="c-category" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="Development, Design, Marketing..." />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-duration">Duration</FieldLabel>
                <Input id="c-duration" value={duration} onChange={(e) => setDuration(e.target.value)}
                  placeholder="12h 30m" />
              </Field>
            </div>
            <Field>
              <FieldLabel>Level</FieldLabel>
              <Select value={level} onValueChange={(v) => v && setLevel(v as Course["level"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Course status</FieldLabel>
                <Select value={status} onValueChange={(v) => v && setStatus(v as Course["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUSES.map((s) => <SelectItem key={s.value!} value={s.value!}>{s.label}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">Shown as a badge on course cards.</p>
              </Field>
              <Field>
                <FieldLabel htmlFor="c-start-date">Start date</FieldLabel>
                <Input id="c-start-date" type="date" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Leave blank if not applicable.</p>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Course validity</FieldLabel>
                <Select
                  value={validitySelect}
                  onValueChange={(v) => { const val = v ?? ""; setValiditySelect(val); if (val !== "custom") setCustomDays("") }}
                >
                  <SelectTrigger><SelectValue placeholder="Select validity" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {VALIDITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">How long students can access after purchase.</p>
              </Field>
              {validitySelect === "custom" && (
                <Field>
                  <FieldLabel htmlFor="c-custom-days">Custom days</FieldLabel>
                  <Input id="c-custom-days" type="number" min={1} value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)} placeholder="e.g. 60" />
                </Field>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor="c-thumbnail">Thumbnail</FieldLabel>
              <Input id="c-thumbnail" type="file" accept="image/*" onChange={handleThumbnailChange} />
              <p className="mt-2 text-xs text-muted-foreground">
                {thumbnailName
                  ? `New image selected: ${thumbnailName}`
                  : editing
                    ? "Leave blank to keep the current thumbnail."
                    : "Upload a course thumbnail image."}
              </p>
              {/* Show current/new thumbnail preview */}
              {thumbnail && (
                <div className="mt-3 overflow-hidden rounded-md border">
                  <img
                    src={thumbnail}
                    alt="Course thumbnail preview"
                    className="h-32 w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </div>
              )}
            </Field>
          </FieldGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loadingCourse || uploadingThumb}>
            {(saving || uploadingThumb) && <Spinner data-icon="inline-start" />}
            {uploadingThumb ? "Uploading image…" : editing ? "Save changes" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
