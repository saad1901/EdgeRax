"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Monitor, Smartphone, Laptop, LogOut, RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

interface Session {
  id: string
  deviceLabel: string
  ipAddress: string
  createdAt: string
  isCurrent: boolean
}

function DeviceIcon({ label }: { label: string }) {
  const l = label.toLowerCase()
  if (l.includes("phone") || l.includes("iphone") || l.includes("android phone"))
    return <Smartphone className="size-5 shrink-0 text-muted-foreground" />
  return <Monitor className="size-5 shrink-0 text-muted-foreground" />
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function ManageSessionsContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const email       = searchParams.get("email") ?? ""
  const password    = searchParams.get("password") ?? ""
  const redirectTo  = searchParams.get("redirect") ?? "/"

  const [sessions,  setSessions]  = useState<Session[]>([])
  const [maxDevices, setMaxDevices] = useState<number>(0)
  const [loading,   setLoading]   = useState(true)
  const [revoking,  setRevoking]  = useState<string | null>(null)

  // If no credentials in URL, send back to login
  useEffect(() => {
    if (!email || !password) {
      router.replace("/auth")
    }
  }, [email, password, router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/sessions?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to load sessions."); return }
      setSessions(data.sessions ?? [])
      setMaxDevices(data.maxDevices ?? 0)
    } catch {
      toast.error("Failed to load sessions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (email && password) load()
  }, [email, password])

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method:  "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to log out session."); return }
      toast.success("Device logged out.")
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch {
      toast.error("Failed to log out session.")
    } finally {
      setRevoking(null)
    }
  }

  async function tryLogin() {
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.sessionLimitReached) {
          toast.error("Still at the device limit. Log out another session first.")
          load()
          return
        }
        toast.error(data.error ?? "Login failed.")
        return
      }
      toast.success("Logged in!")
      router.replace(redirectTo)
      router.refresh()
    } catch {
      toast.error("Login failed. Please try again.")
    }
  }

  const nonCurrentSessions = sessions.filter((s) => !s.isCurrent)
  // User needs to remove sessions until count drops below maxDevices
  // e.g. limit=3, currently 3 sessions → need to remove 1 (3-3+1=1)
  const needToRemove = maxDevices > 0 ? Math.max(0, nonCurrentSessions.length - maxDevices + 1) : 0
  const canLogin = needToRemove === 0

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Image src="/logo.png" alt="Edgerax" width={40} height={40} className="rounded-lg bg-black p-1" />
        <span className="text-xl font-semibold tracking-tight">Edgerax</span>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LogOut className="size-5 text-destructive" />
            Device limit reached
          </CardTitle>
          <CardDescription>
            {needToRemove > 0
              ? `You need to log out ${needToRemove} device${needToRemove !== 1 ? "s" : ""} to continue. Log out ${needToRemove === 1 ? "any one" : `any ${needToRemove}`} below.`
              : "All clear — you can now log in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6" />
            </div>
          ) : nonCurrentSessions.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              All sessions have been cleared. You can now log in.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {nonCurrentSessions.map((session) => (
                <div key={session.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <DeviceIcon label={session.deviceLabel} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session.deviceLabel}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDate(session.createdAt)}
                        {session.ipAddress && session.ipAddress !== "unknown" && (
                          <span className="ml-1 hidden sm:inline">· {session.ipAddress}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-destructive hover:border-destructive hover:text-destructive"
                    onClick={() => revokeSession(session.id)}
                    disabled={revoking === session.id}
                  >
                    {revoking === session.id
                      ? <Spinner className="size-3.5" />
                      : <LogOut className="size-3.5" />}
                    Log out
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button onClick={tryLogin} disabled={!canLogin || loading}>
              {canLogin ? "Continue to login" : `Log out ${needToRemove} device${needToRemove !== 1 ? "s" : ""} first`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ManageSessionsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    }>
      <ManageSessionsContent />
    </Suspense>
  )
}
