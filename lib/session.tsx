"use client"

/**
 * Thin client-side session context.
 * Replaces the old localStorage-based StoreProvider for auth state only.
 * All data (courses, purchases, progress) is fetched from API routes.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: "user" | "admin" | "instructor"
  phone?: string | null
  commissionPercent?: number
}

interface SessionValue {
  user: SessionUser | null
  ready: boolean
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SessionContext.Provider value={{ user, ready, refresh }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used inside SessionProvider")
  return ctx
}
