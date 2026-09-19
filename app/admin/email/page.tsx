"use client"

import { useEffect, useRef, useState } from "react"
import {
  Mail, Send, Settings2, Save, Plus, X,
  Users, BookOpen, Paperclip, ToggleLeft, ToggleRight,
} from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { adminApi, type AdminStudent } from "@/lib/api"
import type { Course } from "@/lib/types"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailSettings {
  on_login:    boolean
  on_signup:   boolean
  on_purchase: boolean
  templates: {
    login:    { subject: string; body: string }
    signup:   { subject: string; body: string }
    purchase: { subject: string; body: string }
  }
}

const DEFAULT_SETTINGS: EmailSettings = {
  on_login: false,
  on_signup: true,
  on_purchase: true,
  templates: {
    login:    { subject: "New login to your account",      body: "<p>Hi {{name}},</p><p>We noticed a new login to your account.</p>" },
    signup:   { subject: "Welcome to Edgerax, {{name}}!", body: "<p>Hi {{name}},</p><p>Welcome! Your account has been created successfully.</p><p><a href='{{link}}' style='background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px'>Browse Courses</a></p>" },
    purchase: { subject: "You're enrolled in {{course}}!", body: "<p>Hi {{name}},</p><p>Thank you for enrolling in <strong>{{course}}</strong>.</p>" },
  },
}

export default function AdminEmailPage() {
  // Settings tab state
  const [settings,        setSettings]        = useState<EmailSettings>(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving,  setSettingsSaving]  = useState(false)

  // Compose tab state
  const [students,   setStudents]   = useState<AdminStudent[]>([])
  const [courses,    setCourses]    = useState<Course[]>([])
  const [metaLoaded, setMetaLoaded] = useState(false)

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [composeSubject,   setComposeSubject]   = useState("")
  const [composeBody,      setComposeBody]      = useState("")
  const [attachments,      setAttachments]      = useState<File[]>([])
  const [sending,          setSending]          = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // ── Load settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/email/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSettings({ ...DEFAULT_SETTINGS, ...d }))
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  // ── Load students + courses for compose ──────────────────────────────────
  useEffect(() => {
    if (metaLoaded) return
    Promise.all([adminApi.listStudents(), adminApi.listCourses()])
      .then(([s, c]) => { setStudents(s); setCourses(c) })
      .catch(() => {})
      .finally(() => setMetaLoaded(true))
  }, [metaLoaded])

  // ── Save settings ─────────────────────────────────────────────────────────
  async function handleSaveSettings() {
    setSettingsSaving(true)
    try {
      const res = await fetch("/api/admin/email/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save."); return }
      setSettings({ ...DEFAULT_SETTINGS, ...data })
      toast.success("Email settings saved.")
    } catch {
      toast.error("Failed to save.")
    } finally { setSettingsSaving(false) }
  }

  // ── Compose send ─────────────────────────────────────────────────────────
  async function handleSend() {
    if (!composeSubject.trim()) { toast.error("Subject is required."); return }
    if (!composeBody.trim())    { toast.error("Email body is required."); return }
    if (selectedUserIds.length === 0 && !selectedCourseId) {
      toast.error("Select at least one recipient or a course."); return
    }

    setSending(true)
    try {
      const form = new FormData()
      form.append("subject",  composeSubject)
      form.append("body",     composeBody)
      form.append("userIds",  JSON.stringify(selectedUserIds))
      form.append("courseId", selectedCourseId)
      for (const f of attachments) form.append("file", f)

      const res  = await fetch("/api/admin/email/send", { method: "POST", credentials: "include", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to send."); return }
      toast.success(`Sent to ${data.sent} of ${data.total} recipients.`)
      setComposeSubject(""); setComposeBody(""); setSelectedUserIds([]); setSelectedCourseId(""); setAttachments([])
    } catch {
      toast.error("Failed to send emails.")
    } finally { setSending(false) }
  }

  function toggleUser(id: string | null) {
    if (!id) return;
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function removeAttachment(name: string) {
    setAttachments((prev) => prev.filter((f) => f.name !== name))
  }

  const selectedStudents = students.filter((s) => selectedUserIds.includes(s.id))

  return (
    <AdminShell>
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Mail className="size-6" /> Email
          </h1>
          <p className="text-muted-foreground">
            Configure automatic emails and compose custom messages to students.
          </p>
        </div>

        <Tabs defaultValue="compose">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose"><Send className="mr-1.5 size-3.5" />Compose & Send</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-1.5 size-3.5" />Auto-email Settings</TabsTrigger>
          </TabsList>

          {/* ── Compose tab ── */}
          <TabsContent value="compose" className="flex flex-col gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recipients</CardTitle>
                <CardDescription>
                  Select individual students and/or a course (all purchasers of that course will receive the email).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Student multi-select */}
                <Field>
                  <FieldLabel>Students</FieldLabel>
                  <Select onValueChange={toggleUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a student…" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStudents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedStudents.map((s) => (
                        <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                          {s.name}
                          <button onClick={() => toggleUser(s.id)} aria-label="Remove">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>

                {/* Course select */}
                <Field>
                  <FieldLabel>Course <span className="text-muted-foreground">(optional)</span></FieldLabel>
                  <Select value={selectedCourseId} onValueChange={(v) => setSelectedCourseId(!v || v === "__none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All purchasers of a course…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCourseId && (
                    <FieldDescription>All students who purchased this course will be included.</FieldDescription>
                  )}
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message</CardTitle>
                <CardDescription>
                  Write HTML or plain text. Use <code className="text-xs bg-muted px-1 rounded">{"{{name}}"}</code> and <code className="text-xs bg-muted px-1 rounded">{"{{email}}"}</code> as variables.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>Subject</FieldLabel>
                  <Input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="e.g. Important update about your course"
                  />
                </Field>
                <Field>
                  <FieldLabel>Body (HTML)</FieldLabel>
                  <Textarea
                    rows={10}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="<p>Hi {{name}},</p><p>Your message here...</p>"
                    className="font-mono text-sm"
                  />
                  <FieldDescription>
                    Supports full HTML. Add links with &lt;a href="..."&gt;, buttons with inline styles, images, etc.
                  </FieldDescription>
                </Field>

                {/* Attachments */}
                <Field>
                  <FieldLabel>Attachments <span className="text-muted-foreground">(optional)</span></FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((f) => (
                      <Badge key={f.name} variant="outline" className="gap-1 pr-1">
                        <Paperclip className="size-3" />{f.name}
                        <button onClick={() => removeAttachment(f.name)} aria-label="Remove attachment">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Plus className="size-3.5 mr-1" />Add file
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        setAttachments((prev) => {
                          const names = new Set(prev.map((f) => f.name))
                          return [...prev, ...files.filter((f) => !names.has(f.name))]
                        })
                        e.target.value = ""
                      }}
                    />
                  </div>
                </Field>

                <Button onClick={handleSend} disabled={sending} className="w-fit">
                  {sending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
                  Send email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Settings tab ── */}
          <TabsContent value="settings" className="flex flex-col gap-4 mt-4">
            {settingsLoading ? (
              <div className="flex justify-center py-12"><Spinner className="size-6" /></div>
            ) : (
              <>
                {/* Toggle cards */}
                {([
                  {
                    key: "on_login" as const,
                    label: "Login notification",
                    description: "Send an email to the user whenever they log in from any device.",
                    tplKey: "login" as const,
                    vars: "{{name}}, {{email}}",
                  },
                  {
                    key: "on_signup" as const,
                    label: "Welcome email (signup)",
                    description: "Send a welcome email when a new student creates an account.",
                    tplKey: "signup" as const,
                    vars: "{{name}}, {{email}}, {{link}}",
                  },
                  {
                    key: "on_purchase" as const,
                    label: "Purchase confirmation",
                    description: "Send an email when a student successfully purchases a course.",
                    tplKey: "purchase" as const,
                    vars: "{{name}}, {{email}}, {{course}}, {{link}}",
                  },
                ] as const).map((row) => (
                  <Card key={row.key} className={cn(settings[row.key] && "border-primary/30")}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{row.label}</CardTitle>
                          <CardDescription className="mt-0.5">{row.description}</CardDescription>
                        </div>
                        <button
                          onClick={() => setSettings((p) => ({ ...p, [row.key]: !p[row.key] }))}
                          aria-label={settings[row.key] ? "Disable" : "Enable"}
                          className="shrink-0"
                        >
                          {settings[row.key]
                            ? <ToggleRight className="size-8 text-primary" />
                            : <ToggleLeft  className="size-8 text-muted-foreground" />}
                        </button>
                      </div>
                    </CardHeader>
                    {settings[row.key] && (
                      <CardContent className="flex flex-col gap-3">
                        <p className="text-xs text-muted-foreground">
                          Available variables: <code className="bg-muted px-1 rounded">{row.vars}</code>
                        </p>
                        <Field>
                          <FieldLabel>Subject</FieldLabel>
                          <Input
                            value={settings.templates[row.tplKey].subject}
                            onChange={(e) => setSettings((p) => ({
                              ...p,
                              templates: { ...p.templates, [row.tplKey]: { ...p.templates[row.tplKey], subject: e.target.value } },
                            }))}
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Body (HTML)</FieldLabel>
                          <Textarea
                            rows={8}
                            className="font-mono text-sm"
                            value={settings.templates[row.tplKey].body}
                            onChange={(e) => setSettings((p) => ({
                              ...p,
                              templates: { ...p.templates, [row.tplKey]: { ...p.templates[row.tplKey], body: e.target.value } },
                            }))}
                          />
                        </Field>
                      </CardContent>
                    )}
                  </Card>
                ))}

                <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-fit">
                  {settingsSaving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                  Save email settings
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}
