"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Phone, Mail, MapPin } from "lucide-react"
import { siteSettingsApi, type SiteSettings } from "@/lib/api"

export function SiteFooter() {
  const [settings, setSettings] = useState<SiteSettings>({ phones: [], emails: [], addresses: [] })

  useEffect(() => {
    siteSettingsApi.get().then(setSettings).catch(() => {})
  }, [])

  const hasContact =
    settings.phones.length > 0 ||
    settings.emails.length > 0 ||
    settings.addresses.length > 0

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="w-fit">
              <Image
                src="/footer-logo.png"
                alt="Edgerax — Learn. Grow. Excel."
                width={160}
                height={160}
                className="rounded-xl bg-black p-2"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Learn in-demand skills with expert-led courses in Programming, AI, Data Science,
              Web Development, Finance, and more.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Quick Links</p>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/my-courses" className="hover:text-foreground transition-colors">My Courses</Link>
              <Link href="/profile" className="hover:text-foreground transition-colors">Profile</Link>
              <Link href="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Legal</p>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </nav>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium mb-1">Secured payments by</p>
              <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 w-fit">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 512 512"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect width="512" height="512" rx="80" fill="#072654" />
                  <path
                    d="M175 370L230 142H310L340 260L390 142H470L395 370H315L285 252L235 370H175Z"
                    fill="#ffffff"
                  />
                  <path d="M90 370L130 200H200L160 370H90Z" fill="#3395FF" />
                </svg>
                <span className="text-xs font-semibold text-foreground">Razorpay</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          {hasContact && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Contact Us</p>
              <div className="flex flex-col gap-2">
                {settings.phones.map((p, i) => (
                  <a
                    key={i}
                    href={`tel:${p.replace(/\s/g, "")}`}
                    className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="size-3.5 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </a>
                ))}
                {settings.emails.map((e, i) => (
                  <a
                    key={i}
                    href={`mailto:${e}`}
                    className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="size-3.5 mt-0.5 shrink-0" />
                    <span className="break-all">{e}</span>
                  </a>
                ))}
                {settings.addresses.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 mt-0.5 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Edgerax. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Learn. Grow. Achieve.
          </p>
        </div>
      </div>
    </footer>
  )
}
