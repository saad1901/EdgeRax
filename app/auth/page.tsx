"use client"

import Image from "next/image"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, BookOpen, Award, Users, Zap } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/session"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const BRAND_FEATURES = [
  { icon: BookOpen, text: "100+ expert-led courses" },
  { icon: Award,    text: "Industry-recognised certificates" },
  { icon: Users,    text: "Join 10,000+ learners" },
  { icon: Zap,      text: "Learn at your own pace" },
]

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.sessionLimitReached) {
          sessionStorage.setItem("mgmt_email", loginEmail)
          sessionStorage.setItem("mgmt_password", loginPassword)
          const params = new URLSearchParams({ redirect: redirectTo })
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
    <div className="flex min-h-svh">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] shrink-0 flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-10 text-primary-foreground">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Edgerax" width={36} height={36} className="rounded-lg bg-black/30 p-1" />
          <span className="text-xl font-bold tracking-tight">Edgerax</span>
        </Link>

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-extrabold leading-snug tracking-tight">
              Start your learning<br />journey today.
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/70 leading-relaxed max-w-sm">
              Gain in-demand skills with courses built by industry experts. Learn at your own pace and earn certificates that open doors.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {BRAND_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Edgerax. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 px-5 py-10">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <Image src="/logo.png" alt="Edgerax" width={38} height={38} className="rounded-lg bg-black p-1" />
          <span className="text-xl font-semibold tracking-tight">Edgerax</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-7 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight">
              {tab === "login" ? "Sign in to your account" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {tab === "login"
                ? "Welcome back! Enter your credentials to continue."
                : "Join thousands of learners already on Edgerax."}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
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
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                      {loading ? <Spinner data-icon="inline-start" /> : null}
                      Sign in
                    </Button>
                  </FieldGroup>
                </form>
              </TabsContent>

              <TabsContent value="signup">
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
                      <div className="relative">
                        <Input id="signup-password" type={showPassword ? "text" : "password"}
                          required placeholder="At least 6 characters"
                          value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <FieldDescription>Use 6 or more characters.</FieldDescription>
                    </Field>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                      {loading ? <Spinner data-icon="inline-start" /> : null}
                      Create account
                    </Button>
                  </FieldGroup>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
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
