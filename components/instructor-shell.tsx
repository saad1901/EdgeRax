"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, BookOpen, KeyRound, LayoutDashboard, LogOut } from "lucide-react"
import { PasswordChangeDialog } from "@/components/password-change-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { authApi } from "@/lib/api"
import { useSession } from "@/lib/session"
import { cn, initials } from "@/lib/utils"
import { toast } from "sonner"

const NAV = [
  { href: "/instructor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instructor/courses", label: "Courses", icon: BookOpen },
]

export function InstructorShell({ children }: { children: React.ReactNode }) {
  const { user, ready, refresh } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [passwordOpen, setPasswordOpen] = useState(false)

  useEffect(() => {
    if (ready && (!user || (user.role !== "instructor" && user.role !== "admin"))) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [ready, user, router, pathname])

  if (!ready || !user || (user.role !== "instructor" && user.role !== "admin")) {
    return <div className="flex min-h-svh items-center justify-center"><Spinner /></div>
  }

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    router.push("/")
    toast.success("Signed out.")
  }

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/instructor" className="mb-6 flex items-center gap-2 px-2">
          <Image src="/logo.png" alt="Edgerax" width={32} height={32} className="rounded-lg bg-black p-1" />
          <span className="font-semibold">Instructor Panel</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}>
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Button variant="ghost" className="justify-start" onClick={() => setPasswordOpen(true)}>
            <KeyRound data-icon="inline-start" />Change password
          </Button>
          <Button variant="ghost" className="justify-start" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" />Back to site
          </Button>
          <Button variant="ghost" className="justify-start" onClick={handleLogout}>
            <LogOut data-icon="inline-start" />Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PasswordChangeDialog mode="self" open={passwordOpen} onOpenChange={setPasswordOpen} onSaved={() => refresh()} />
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Edgerax" width={28} height={28} className="rounded-md bg-black p-1" />
            <span className="font-semibold">Instructor</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback></Avatar>
              </button>
            } />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound data-icon="inline-start" />Change password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut data-icon="inline-start" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  )
}
