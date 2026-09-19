"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, BookOpen, ArrowLeft, LogOut, Users, KeyRound, Share2, Settings, MessageSquare, Lock, Award, BadgeIndianRupee, Smartphone, Tag, GraduationCap, Megaphone, PieChart, Receipt, Wallet, Mail, Briefcase, Menu } from "lucide-react"
import { useSession } from "@/lib/session"
import { authApi } from "@/lib/api"
import { cn, initials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { PasswordChangeDialog } from "@/components/password-change-dialog"

const NAV = [
  { href: "/admin",               label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/courses",       label: "Courses",      icon: BookOpen         },
  { href: "/admin/careers",       label: "Careers",      icon: Briefcase        },
  { href: "/admin/students",      label: "Students",     icon: Users            },
  { href: "/admin/instructors",   label: "Instructors",  icon: GraduationCap    },
  { href: "/admin/revenue",       label: "Revenue",     icon: BadgeIndianRupee },
  { href: "/admin/transactions",  label: "Transactions", icon: Receipt          },
  { href: "/admin/payouts",       label: "Payouts",      icon: Wallet           },
  { href: "/admin/apps",          label: "Apps",        icon: Smartphone       },
  { href: "/admin/community",     label: "Community",   icon: MessageSquare    },
  { href: "/admin/referrals",     label: "Referrals",   icon: Share2          },
  { href: "/admin/certificates",  label: "Certificates", icon: Award          },
  { href: "/admin/coupons",       label: "Coupons",      icon: Tag             },
  { href: "/admin/access",        label: "Access",       icon: Lock            },
  { href: "/admin/marketing",     label: "Marketing",   icon: Megaphone       },
  { href: "/admin/shares",        label: "Shares",      icon: PieChart        },
  { href: "/admin/email",         label: "Email",       icon: Mail            },
  { href: "/admin/settings",      label: "Settings",    icon: Settings        },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready, refresh } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [passwordOpen, setPasswordOpen] = useState(false)

  // Client-side guard (middleware handles server-side)
  useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [ready, user, router, pathname])

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    router.push("/")
    toast.success("Signed out.")
  }

  const primaryMobileNav = NAV.slice(0, 4)

  return (
    <div className="flex min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <Image src="/logo.png" alt="Edgerax" width={32} height={32} className="rounded-lg bg-black p-1" />
          <span className="font-semibold">Edgerax Admin</span>
        </Link>
        <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}>
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 pt-4">
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
        <PasswordChangeDialog
          mode="self"
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
          onSaved={() => refresh()}
        />
        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Edgerax" width={28} height={28} className="rounded-md bg-black p-1" />
            <span className="font-semibold text-sm">Admin</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Page Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <Menu className="size-3.5" /> Navigation
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-xs font-semibold">Admin Pages</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {NAV.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} render={<Link href={href} />} className={cn("flex items-center gap-2 text-xs", pathname === href && "font-bold text-primary")}>
                    <Icon className="size-3.5" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              } />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <KeyRound data-icon="inline-start" />Change password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut data-icon="inline-start" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
          aria-label="Admin navigation">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {primaryMobileNav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  pathname === href ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
                )}>
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <button className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                  <Menu className="size-4" />
                  <span>More</span>
                </button>
              } />
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto mb-2">
                {NAV.slice(4).map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} render={<Link href={href} />} className={cn("flex items-center gap-2 text-xs", pathname === href && "font-bold text-primary")}>
                    <Icon className="size-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/" />} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowLeft className="size-4" />Back to main site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  )
}
