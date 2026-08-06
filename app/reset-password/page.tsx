"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Eye, EyeOff } from "lucide-react"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    setError("")
    try {
      await authApi.resetPassword(token, password)
      setComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset the password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{complete ? "Password reset" : "Create a new password"}</CardTitle>
        <CardDescription>
          {complete ? "Your new password is ready to use." : "Choose a new password for your Edgerax account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {complete ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary"><CheckCircle2 className="size-7" /></div>
            <p className="text-sm text-muted-foreground">All existing sessions were signed out to protect your account.</p>
            <Button className="w-full" nativeButton={false} render={<Link href="/auth" />}>Log in</Button>
          </div>
        ) : !token ? (
          <div className="flex flex-col gap-4 text-center">
            <p role="alert" className="text-sm text-destructive">This password reset link is invalid.</p>
            <Button nativeButton={false} render={<Link href="/forgot-password" />}>Request a new link</Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldDescription>Use at least 6 characters.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner data-icon="inline-start" />}Reset password
              </Button>
              {error && <Button variant="ghost" nativeButton={false} render={<Link href="/forgot-password" />}>Request a new link</Button>}
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/logo.png" alt="Edgerax" width={40} height={40} className="rounded-lg bg-black p-1" />
        <span className="text-xl font-semibold tracking-tight">Edgerax</span>
      </Link>
      <Suspense fallback={<div className="flex py-20"><Spinner className="size-8" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
