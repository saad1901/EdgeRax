"use client"

import Image from "next/image"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/session"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") ?? "/"
  const { refresh } = useSession()

  const [tab, setTab] = useState("login")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginEmail, setLoginEmail]       = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone]       = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Use raw fetch so we can inspect the body before throwing on non-ok status
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Device limit hit — redirect to manage-sessions page
        if (data.sessionLimitReached) {
          const params = new URLSearchParams({
            email: loginEmail,
            password: loginPassword,
            redirect: redirectTo,
          })
          router.push(`/manage-sessions?${params.toString()}`)
          return
        }
        toast.error(data.error ?? "Login failed.")
        return
      }

      await refresh()
      toast.success("Welcome back!")
      router.replace(redirectTo)
      router.refresh()
    } catch {
      toast.error("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return }
    if (!phone.trim()) { toast.error("Phone number is required."); return }
    setLoading(true)
    try {
      await authApi.signup(name, email, password, phone)
      await refresh()
      toast.success("Account created! Welcome to Edgerax.")
      router.replace(redirectTo)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Sign-up failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/logo.png" alt="Edgerax" width={40} height={40} className="rounded-lg bg-black p-1" />
        <span className="text-xl font-semibold tracking-tight">Edgerax</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in or create an account to start learning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input id="login-email" type="email" required placeholder="you@example.com"
                      value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="login-password">Password</FieldLabel>
                      <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input id="login-password" type={showPassword ? "text" : "password"}
                        required placeholder="••••••••"
                        value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                      <button type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner data-icon="inline-start" /> : null}
                    Log in
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Full name</FieldLabel>
                    <Input id="name" required placeholder="Jane Doe"
                      value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                    <Input id="signup-email" type="email" required placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-phone">Phone number</FieldLabel>
                    <Input id="signup-phone" type="tel" required placeholder="10-digit mobile number"
                      value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <FieldDescription>Required for withdrawal payouts.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <Input id="signup-password" type="password" required placeholder="At least 6 characters"
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <FieldDescription>Use 6 or more characters.</FieldDescription>
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner data-icon="inline-start" /> : null}
                    Create account
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
