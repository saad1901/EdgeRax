"use client"

import { useEffect, useState, useRef } from "react"
import { Gift, BookOpen, CheckCircle2, IndianRupee, Search, X, User } from "lucide-react"
import { toast } from "sonner"
import { formatPrice } from "@/lib/format"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminApi, type AdminStudent } from "@/lib/api"
import type { Course } from "@/lib/types"

interface Props {
  student?: AdminStudent | null
  courseId?: string
  courseName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onGranted?: () => void
}

export function GiveawayDialog({
  student, courseId: prefillCourseId, courseName: prefillCourseName,
  open, onOpenChange, onGranted,
}: Props) {
  const [courses,        setCourses]        = useState<Course[]>([])
  const [students,       setStudents]       = useState<AdminStudent[]>([])
  const [selectedCourse, setSelectedCourse] = useState(prefillCourseId ?? "")
  const [selectedUser,   setSelectedUser]   = useState(student?.id ?? "")
  const [paymentMode,    setPaymentMode]    = useState<"cash" | "free">("cash")
  const [amount,         setAmount]         = useState("")
  const [studentSearch,  setStudentSearch]  = useState("")
  const [referrerSearch, setReferrerSearch] = useState("")
  const [selectedReferrer, setSelectedReferrer] = useState("")
  const [saving,         setSaving]         = useState(false)
  const [done,           setDone]           = useState(false)

  const [studentListOpen,  setStudentListOpen]  = useState(false)
  const [referrerListOpen, setReferrerListOpen] = useState(false)

  const studentContainerRef  = useRef<HTMLDivElement>(null)
  const referrerContainerRef = useRef<HTMLDivElement>(null)

  // Reset when dialog opens
  useEffect(() => {
    if (!open) return
    setDone(false); setSaving(false)
    setSelectedCourse(prefillCourseId ?? "")
    setSelectedUser(student?.id ?? "")
    setPaymentMode("cash")
    setAmount("")
    setStudentSearch("")
    setReferrerSearch("")
    setSelectedReferrer("")
    setStudentListOpen(false)
    setReferrerListOpen(false)
  }, [open, prefillCourseId, student?.id])

  useEffect(() => {
    if (!open || prefillCourseId) return
    adminApi.listCourses().then(setCourses).catch(console.error)
  }, [open, prefillCourseId])

  useEffect(() => {
    if (!open) return
    Promise.all([
      adminApi.listStudents(),
      adminApi.listInstructors(),
    ]).then(([stList, instList]) => {
      const formattedInstructors: AdminStudent[] = instList.map((inst) => ({
        id: inst.id,
        name: inst.name,
        email: inst.email,
        phone: inst.phone ?? null,
        role: "instructor",
        createdAt: inst.createdAt ?? new Date().toISOString(),
        enrollments: [],
      }))

      const existingIds = new Set(stList.map((s) => s.id))
      const combined = [...stList]
      for (const inst of formattedInstructors) {
        if (!existingIds.has(inst.id)) {
          combined.push(inst)
        }
      }
      setStudents(combined)
    }).catch(console.error)
  }, [open])

  useEffect(() => {
    if (selectedReferrer && selectedReferrer === selectedUser) {
      setSelectedReferrer("")
    }
  }, [selectedUser, selectedReferrer])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (studentContainerRef.current && !studentContainerRef.current.contains(e.target as Node)) {
        setStudentListOpen(false)
      }
      if (referrerContainerRef.current && !referrerContainerRef.current.contains(e.target as Node)) {
        setReferrerListOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleGrant() {
    if (!selectedUser || !selectedCourse) {
      toast.error("Select both a student and a course."); return
    }
    if (paymentMode === "cash") {
      const n = Number(amount)
      if (!amount || isNaN(n) || n <= 0) {
        toast.error("Enter a valid amount for cash payment."); return
      }
    }

    const cleanReferrer = selectedReferrer && selectedReferrer !== "none" ? selectedReferrer : undefined

    setSaving(true)
    try {
      await adminApi.grantAccess(
        selectedUser,
        selectedCourse,
        paymentMode,
        paymentMode === "cash" ? Number(amount) : undefined,
        cleanReferrer,
      )
      setDone(true)
      const sName = student?.name ?? students.find((s) => s.id === selectedUser)?.name ?? "Student"
      const cName = prefillCourseName ?? courses.find((c) => c.id === selectedCourse)?.title ?? "course"
      toast.success(`Access granted — ${sName} can now access "${cName}".`)
      onGranted?.()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to grant access.")
    } finally {
      setSaving(false)
    }
  }

  const selectedCourseObj   = courses.find((c) => c.id === selectedCourse)
  const selectedStudentObj  = student ?? students.find((s) => s.id === selectedUser)
  const selectedReferrerObj = students.find((s) => s.id === selectedReferrer)

  // Auto prefill amount when course is selected and amount is blank
  useEffect(() => {
    if (selectedCourseObj && !amount) {
      setAmount(String(selectedCourseObj.price))
    }
  }, [selectedCourse, selectedCourseObj])

  const alreadyEnrolled = student?.enrollments.some((e) => e.courseId === selectedCourse)

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.phone && s.phone.toLowerCase().includes(studentSearch.toLowerCase()))
  )

  const filteredReferrers = students.filter(
    (s) =>
      s.id !== selectedUser && // cannot refer yourself
      (s.name.toLowerCase().includes(referrerSearch.toLowerCase()) ||
       s.email.toLowerCase().includes(referrerSearch.toLowerCase()) ||
       (s.phone && s.phone.toLowerCase().includes(referrerSearch.toLowerCase())))
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gift className="size-4" />
            </span>
            <DialogTitle>Grant course access &amp; record payment</DialogTitle>
          </div>
          <DialogDescription>
            Grant a student access to a course. Record an offline cash payment or give it for free with optional referral attribution.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <p className="font-semibold">Access granted!</p>
            <p className="text-sm text-muted-foreground">
              The student can now access the course from their dashboard.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5 py-2">
              {/* Row 1: Student & Course */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Student Selection */}
                <div className="flex flex-col gap-1.5 min-w-0" ref={studentContainerRef}>
                  <label className="text-sm font-medium">Student</label>
                  
                  {selectedStudentObj ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {selectedStudentObj.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm leading-none flex items-center gap-1.5">
                            {selectedStudentObj.name}
                            {selectedStudentObj.role === "instructor" && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                Instructor
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground mt-1">
                            {selectedStudentObj.email}{selectedStudentObj.phone ? ` • ${selectedStudentObj.phone}` : ""}
                          </p>
                        </div>
                      </div>
                      {!student && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(""); setStudentSearch(""); setStudentListOpen(true) }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="mr-1 size-3" /> Change
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Type student name, email, or phone…"
                          value={studentSearch}
                          onChange={(e) => {
                            setStudentSearch(e.target.value)
                            setStudentListOpen(true)
                          }}
                          onFocus={() => setStudentListOpen(true)}
                          className="pl-9 text-sm"
                        />
                      </div>

                      {studentListOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                          {filteredStudents.length === 0 ? (
                            <p className="p-3 text-center text-xs text-muted-foreground">
                              No students found matching "{studentSearch}".
                            </p>
                          ) : (
                            filteredStudents.slice(0, 30).map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(s.id)
                                  setStudentSearch("")
                                  setStudentListOpen(false)
                                }}
                                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{s.name}</span>
                                  {s.role === "instructor" && (
                                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                      Instructor
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {s.email}{s.phone ? ` • ${s.phone}` : ""}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Course Selection */}
                {!prefillCourseId ? (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-sm font-medium">Course</label>
                    <Select value={selectedCourse} onValueChange={(v) => setSelectedCourse(v ?? "")}>
                      <SelectTrigger className="w-full h-10"><SelectValue placeholder="Select a course…" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Course</label>
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2.5 h-10">
                      <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                      <p className="truncate font-medium text-sm">{prefillCourseName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Payment mode & Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Payment mode */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Payment type</label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "cash" | "free")}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <span className="font-medium">Cash</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">— paid offline</span>
                      </SelectItem>
                      <SelectItem value="free">
                        <span className="font-medium">Free</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">— no charge (giveaway)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount — only shown for cash */}
                {paymentMode === "cash" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span>Amount collected (₹)</span>
                      {selectedCourseObj && (
                        <span className="text-xs text-muted-foreground font-normal">
                          Course Price: <strong className="text-foreground">{formatPrice(selectedCourseObj.price)}</strong>
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="pl-8 h-10"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={selectedCourseObj ? `e.g. ${selectedCourseObj.price}` : "e.g. 499"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Referrer — only shown for cash */}
              {paymentMode === "cash" && (
                <div className="flex flex-col gap-1.5 border-t pt-4">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Referred by <span className="text-xs text-muted-foreground font-normal">(optional referral person)</span>
                  </label>

                  <div className="relative min-w-0" ref={referrerContainerRef}>
                    {selectedReferrerObj ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {selectedReferrerObj.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm leading-none flex items-center gap-1.5">
                              {selectedReferrerObj.name}
                              {selectedReferrerObj.role === "instructor" && (
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  Instructor
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground mt-1">
                              {selectedReferrerObj.email}{selectedReferrerObj.phone ? ` • ${selectedReferrerObj.phone}` : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedReferrer(""); setReferrerSearch(""); setReferrerListOpen(true) }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="mr-1 size-3" /> Change
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Type referrer name, email, or phone (optional)…"
                            value={referrerSearch}
                            onChange={(e) => {
                              setReferrerSearch(e.target.value)
                              setReferrerListOpen(true)
                            }}
                            onFocus={() => setReferrerListOpen(true)}
                            className="pl-9 text-sm"
                          />
                        </div>

                        {referrerListOpen && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReferrer("none")
                                setReferrerSearch("")
                                setReferrerListOpen(false)
                              }}
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border-b mb-1"
                            >
                              None / No Referrer
                            </button>
                            {filteredReferrers.length === 0 ? (
                              <p className="p-3 text-center text-xs text-muted-foreground">
                                No referrers found matching "{referrerSearch}".
                              </p>
                            ) : (
                              filteredReferrers.slice(0, 30).map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedReferrer(r.id)
                                    setReferrerSearch("")
                                    setReferrerListOpen(false)
                                  }}
                                  className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-foreground">{r.name}</span>
                                    {r.role === "instructor" && (
                                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        Instructor
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {r.email}{r.phone ? ` • ${r.phone}` : ""}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Referral payout will be automatically calculated based on full paid amount and credited to referrer.
                  </p>
                </div>
              )}

              {/* Already enrolled warning */}
              {alreadyEnrolled && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  This student is already enrolled in the selected course.
                </p>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleGrant}
                disabled={saving || !selectedUser || !selectedCourse || alreadyEnrolled}
              >
                {saving
                  ? <><Spinner data-icon="inline-start" />Granting…</>
                  : <><Gift data-icon="inline-start" />{paymentMode === "cash" ? "Record & grant access" : "Grant free access"}</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
