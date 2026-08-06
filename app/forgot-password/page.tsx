"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, MailCheck } from "lucide-react"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request a password reset.")
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
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>
            {sent ? "Check your inbox for the next step." : "Enter your account email and we’ll send you a secure reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary"><MailCheck className="size-7" /></div>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong className="text-foreground">{email}</strong>, a reset link has been sent. It expires in 30 minutes.
              </p>
              <Button className="w-full" nativeButton={false} render={<Link href="/auth" />}>
                <ArrowLeft data-icon="inline-start" />Back to login
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSent(false)}>Try another email</Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Spinner data-icon="inline-start" />}Send reset link
                </Button>
                <Button variant="ghost" className="w-full" nativeButton={false} render={<Link href="/auth" />}>
                  <ArrowLeft data-icon="inline-start" />Back to login
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
