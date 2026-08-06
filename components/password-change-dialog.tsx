"use client"

import { useEffect, useState } from "react"
import { KeyRound, Lock } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { adminApi, authApi } from "@/lib/api"

interface Props {
  mode: "self" | "user"
  userId?: string
  userName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function PasswordChangeDialog({
  mode,
  userId,
  userName,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSaving(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    if (mode === "self" && !currentPassword) {
      toast.error("Enter your current password first.")
      return
    }

    if (mode === "user" && !userId) {
      toast.error("A user must be selected before changing the password.")
      return
    }

    setSaving(true)
    try {
      if (mode === "self") {
        await authApi.changePassword(currentPassword, newPassword)
        toast.success("Password updated successfully.")
      } else {
        await adminApi.changeUserPassword(userId!, newPassword)
        toast.success(`Password updated for ${userName ?? "the selected user"}.`)
      }
      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={saving ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              {mode === "self" ? <Lock className="size-4" /> : <KeyRound className="size-4" />}
            </span>
            <div>
              <DialogTitle>{mode === "self" ? "Change your password" : "Change user password"}</DialogTitle>
              <DialogDescription>
                {mode === "self"
                  ? "Use a strong password you have not used before."
                  : `Set a new password for ${userName ?? "this user"}.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "self" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">New password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Confirm new password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Spinner data-icon="inline-start" />Saving…</> : "Save password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
