"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Send, Trash2, MessageSquare,
  Image as ImageIcon, RefreshCw, ShieldCheck, GraduationCap,
  Lock, Loader2,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useSession } from "@/lib/session"
import { coursesApi } from "@/lib/api"
import type { Course } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  userId: string
  roomId: string
  message: string
  attachmentUrl: string | null
  createdAt: string
  deleted: boolean
  _senderName?: string
  _senderRole?: string
}

// ─── Sender badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role?: string }) {
  if (role === "admin") return (
    <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
      <ShieldCheck className="size-2.5" /> Admin
    </span>
  )
  if (role === "instructor") return (
    <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
      <GraduationCap className="size-2.5" /> Instructor
    </span>
  )
  return null
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, role }: { name: string; role?: string }) {
  const bg =
    role === "admin" ? "bg-red-500" :
    role === "instructor" ? "bg-indigo-500" :
    "bg-primary/80"
  return (
    <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-bold", bg)}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CourseCommunityPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const router = useRouter()
  const { user, ready } = useSession()

  const [course, setCourse] = useState<Course | null>(null)
  const [accessRole, setAccessRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [chatInput, setChatInput] = useState("")
  const [sending, setSending] = useState(false)

  const [uploadingImage, setUploadingImage] = useState(false)
  const [chatImageUrl, setChatImageUrl] = useState<string | null>(null)

  const [refreshing, setRefreshing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)

  // ── Load course + access check ─────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    if (!user) { router.replace(`/auth?redirect=/community/${courseId}`); return }

    async function init() {
      try {
        const [courseData, accessData] = await Promise.all([
          coursesApi.get(courseId),
          fetch(`/api/community/${courseId}/access`, { credentials: "include" }).then((r) => r.json()),
        ])
        setCourse(courseData)
        if (accessData.hasAccess) {
          setAccessRole(accessData.role)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [ready, user, courseId, router])

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadContent = useCallback(async () => {
    if (!accessRole) return
    try {
      const msgs = await fetch(`/api/community/${courseId}/messages`, { credentials: "include" }).then((r) => r.json())
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch { /* ignore */ }
  }, [courseId, accessRole])

  useEffect(() => { loadContent() }, [loadContent])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function uploadImage(file: File): Promise<string | null> {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/image", { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.url as string
    } catch {
      toast.error("Image upload failed.")
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSendMessage() {
    if (!chatInput.trim() && !chatImageUrl) return
    setSending(true)
    try {
      const res = await fetch(`/api/community/${courseId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput.trim(), attachmentUrl: chatImageUrl }),
      })
      if (!res.ok) { toast.error("Failed to send."); return }
      setChatInput("")
      setChatImageUrl(null)
      await loadContent()
    } catch { toast.error("Failed to send.") }
    finally { setSending(false) }
  }

  async function handleDeleteMessage(id: string) {
    await fetch(`/api/community/${courseId}/messages/${id}`, { method: "DELETE", credentials: "include" })
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadContent()
    setRefreshing(false)
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (!ready || loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
      </AppShell>
    )
  }

  if (!accessRole) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed bg-muted/30 py-16 px-6 text-center max-w-md mx-auto mt-10">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You need to enroll in this course to access its community.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" nativeButton={false} render={<Link href="/community" />}>
              <ArrowLeft className="size-4 mr-1.5" /> Back
            </Button>
            {course && (
              <Button nativeButton={false} render={<Link href={`/courses/${courseId}`} />}>
                View Course
              </Button>
            )}
          </div>
        </div>
      </AppShell>
    )
  }

  const canDelete = (ownerId: string) => user?.role === "admin" || user?.role === "instructor" || user?.id === ownerId

  return (
    <AppShell hideFooter mainClassName="max-w-none px-0 py-0 md:pb-0">
      <div className="flex h-[calc(100svh-8.25rem)] min-h-0 flex-col overflow-hidden bg-card md:h-[calc(100svh-4rem)]">
        <div className="flex shrink-0 items-center gap-3 border-b bg-card px-3 py-2.5 shadow-xs sm:px-5">
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/community" />} className="shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <Avatar name={course?.title ?? "Community"} role={accessRole ?? undefined} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold sm:text-base">{course?.title ?? "Course Community"}</h1>
              {accessRole === "admin" && <Badge className="bg-red-600 text-white text-[10px]">Admin</Badge>}
              {accessRole === "instructor" && <Badge className="bg-indigo-600 text-white text-[10px]">Instructor</Badge>}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleRefresh} disabled={refreshing} className="shrink-0">
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-4 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-10 text-muted-foreground">
                <MessageSquare className="size-10 opacity-20" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === user?.id
                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMe && "flex-row-reverse")}>
                    {!isMe && <Avatar name={msg._senderName ?? msg.userId} role={msg._senderRole} />}
                    <div className={cn("flex max-w-[78%] flex-col gap-0.5", isMe && "items-end")}>
                      <div className={cn(
                        "rounded-2xl px-3 py-1.5 text-sm leading-snug shadow-xs",
                        isMe
                          ? "rounded-br-sm bg-emerald-500 text-white"
                          : "bg-card rounded-tl-sm shadow-xs"
                      )}>
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className={cn("text-[11px] font-semibold", isMe ? "text-white/90" : "text-foreground")}>
                            {msg._senderName ?? (isMe ? user?.name?.split(/\s+/)[0] : msg.userId.slice(0, 10))}
                          </span>
                          <RoleBadge role={msg._senderRole} />
                        </div>
                        {msg.message && <p>{msg.message}</p>}
                        {msg.attachmentUrl && (
                          <img src={msg.attachmentUrl} alt="attachment" className="mt-2 max-h-48 rounded-lg object-cover" />
                        )}
                        <p className={cn("mt-0.5 text-right text-[10px] leading-none", isMe ? "text-white/75" : "text-muted-foreground")}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {canDelete(msg.userId) && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-[10px] leading-none text-muted-foreground transition-colors hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t bg-card p-2.5 sm:px-5">
            {chatImageUrl && (
              <div className="relative mb-2 w-fit">
                <img src={chatImageUrl} alt="preview" className="max-h-24 rounded-lg border object-cover" />
                <button onClick={() => setChatImageUrl(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white">
                  <Trash2 className="size-3" />
                </button>
              </div>
            )}
            <div className="mx-auto flex max-w-4xl items-end gap-2">
              <input ref={chatFileRef} type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) { const url = await uploadImage(f); if (url) setChatImageUrl(url) }
                  e.target.value = ""
                }} />
              <Button variant="ghost" size="icon" onClick={() => chatFileRef.current?.click()} disabled={uploadingImage} className="rounded-full">
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              </Button>
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                }}
                placeholder="Message"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl bg-background px-4 py-2.5 text-sm leading-snug"
              />
              <Button size="icon" onClick={handleSendMessage} disabled={sending || (!chatInput.trim() && !chatImageUrl)} className="rounded-full">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
