"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home, LayoutDashboard, LibraryBig, LogOut,
  Menu, User as UserIcon, Users, X, Phone, Mail, MapPin
} from "lucide-react"
import { useState, useEffect } from "react"
import { cn, initials } from "@/lib/utils"
import { useSession } from "@/lib/session"
import { authApi, siteSettingsApi, type SiteSettings } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SiteFooter } from "@/components/site-footer"
import { AppDownloadButtons } from "@/components/app-download-buttons"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"

const navItems = [
  { href: "/",           label: "Home",       icon: Home       },
  { href: "/my-courses", label: "My Courses", icon: LibraryBig },
  { href: "/profile",    label: "Profile",    icon: UserIcon   },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, refresh } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ phones: [], emails: [], addresses: [] })

  useEffect(() => {
    siteSettingsApi.get().then(setSiteSettings).catch(() => {})
  }, [])

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  async function handleLogout() {
    await authApi.logout()
    await refresh()
    router.push("/")
    toast.success("Signed out.")
  }

  const desktopNavItems = [
    ...navItems,
    ...(user ? [{ href: "/community", label: "Community", icon: Users }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }] : []),
    ...(user?.role === "instructor" ? [{ href: "/instructor", label: "Instructor", icon: LayoutDashboard }] : []),
  ]

  const mobileNavItems = [
    ...desktopNavItems,
  ]

  return (
    <div className="flex min-h-svh flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/logo.png" alt="Edgerax" width={36} height={36} className="rounded-lg bg-black p-1" />
            <span className="text-lg font-semibold tracking-tight">Edgerax</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {desktopNavItems.map((item) => (
              <Button key={item.href} variant={isActive(item.href) ? "secondary" : "ghost"}
                nativeButton={false} render={<Link href={item.href} />}>
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden md:flex">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Avatar className="size-9">
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
                      </button>
                    } />
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span className="truncate font-medium">{user.name}</span>
                          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push("/profile")}>
                          <UserIcon data-icon="inline-start" />Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/my-courses")}>
                          <LibraryBig data-icon="inline-start" />My Courses
                        </DropdownMenuItem>
                        {user.role === "admin" && (
                          <DropdownMenuItem onClick={() => router.push("/admin")}>
                            <LayoutDashboard data-icon="inline-start" />Admin Panel
                          </DropdownMenuItem>
                        )}
                        {user.role === "instructor" && (
                          <DropdownMenuItem onClick={() => router.push("/instructor")}>
                            <LayoutDashboard data-icon="inline-start" />Instructor Panel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                        <LogOut data-icon="inline-start" />Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Mobile hamburger for logged-in user */}
                <Button variant="ghost" size="icon" className="md:hidden"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  onClick={() => setMobileMenuOpen((o) => !o)}>
                  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>
              </>
            ) : (
              <>
                <Button nativeButton={false} render={<Link href="/auth" />} className="hidden md:inline-flex">Sign in</Button>
                <Button variant="ghost" size="icon" className="md:hidden"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  onClick={() => setMobileMenuOpen((o) => !o)}>
                  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>

      {/* Footer — hidden on mobile when bottom nav is shown */}
      <div className="hidden md:block">
        <SiteFooter />
      </div>

      {/* Mobile bottom nav (logged-in) */}
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
          aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-md items-stretch justify-around">
            {mobileNavItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}>
                <item.icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Mobile menu for all users */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background pt-16 md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {user ? (
              <>
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Separator />
                {desktopNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="size-5" />
                    {item.label}
                  </Link>
                ))}
                <Separator />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setContactDialogOpen(true);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted text-left"
                >
                  <Phone className="size-5" />Contact Us
                </button>
                <Separator />
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold mb-2">Download App</p>
                  <AppDownloadButtons />
                </div>
                <Separator />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted text-left text-destructive"
                >
                  <LogOut className="size-5" />Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}>
                  <Home className="size-5" />Home
                </Link>
                <Separator />
                <Link href="/auth" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}>
                  <UserIcon className="size-5" />Sign in
                </Link>
                <Separator />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setContactDialogOpen(true);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted text-left"
                >
                  <Phone className="size-5" />Contact Us
                </button>
                <Separator />
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold mb-2">Download App</p>
                  <AppDownloadButtons />
                </div>
              </>
            )}
          </nav>
        </div>
      )}
      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {siteSettings.phones.map((p, i) => (
              <a
                key={i}
                href={`tel:${p.replace(/\s/g, "")}`}
                className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="size-4 mt-0.5 shrink-0" />
                <span>{p}</span>
              </a>
            ))}
            {siteSettings.emails.map((e, i) => (
              <a
                key={i}
                href={`mailto:${e}`}
                className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="size-4 mt-0.5 shrink-0" />
                <span className="break-all">{e}</span>
              </a>
            ))}
            {siteSettings.addresses.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
