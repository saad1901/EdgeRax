"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Clock, Banknote, Users, ArrowRight, Search } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/format"
import type { Internship } from "@/lib/internship-types"

export default function CareersPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading]         = useState(true)
  const [query, setQuery]             = useState("")

  useEffect(() => {
    fetch("/api/internships")
      .then((r) => r.json())
      .then(setInternships)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = internships.filter((i) => {
    const q = query.trim().toLowerCase()
    return !q || i.title.toLowerCase().includes(q) || i.domain.toLowerCase().includes(q)
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-primary/80 px-6 py-10 text-primary-foreground md:px-10 md:py-14">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm font-medium">
              <Briefcase className="size-4" />
              Internship Programme
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Kickstart Your Career with Real-World Experience
            </h1>
            <p className="text-pretty text-sm text-primary-foreground/80 md:text-base">
              Join our guided internship programme. Work on real projects, get mentored by industry experts,
              and earn a certificate to showcase your skills — all with structured guidance and expert mentorship.
            </p>
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search internships by title or domain…"
            className="h-11 pl-9"
          />
        </div>

        {/* Listings */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">
            Open Internships
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-muted/40 py-16 text-center text-muted-foreground">
              <Briefcase className="mx-auto mb-3 size-10 opacity-30" />
              <p className="font-medium">No internships available right now.</p>
              <p className="text-sm">Check back soon — new positions are added regularly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((i) => (
                <InternshipCard key={i.id} internship={i} />
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="rounded-2xl border bg-muted/30 p-6 md:p-8">
          <h2 className="mb-6 text-xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              { step: "1", title: "Browse & Apply", desc: "Choose an internship that matches your interests and upload your resume." },
              { step: "2", title: "Shortlisting", desc: "Our recruitment team reviews your profile, resume, and academic preferences." },
              { step: "3", title: "Get Offered", desc: "Receive an offer letter and complete your onboarding process." },
              { step: "4", title: "Work & Earn Certificate", desc: "Complete assigned tasks with mentorship and earn a verifiable certificate." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function InternshipCard({ internship: i }: { internship: Internship }) {
  const isFree = Number(i.applicationFee) === 0
  const deadline = i.lastDateToApply ? new Date(i.lastDateToApply) : null
  const isDeadlineSoon = deadline && (deadline.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000

  return (
    <Card className="flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
      {i.thumbnail && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img src={i.thumbnail} alt={i.title} className="size-full object-cover" />
        </div>
      )}
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary">{i.domain || "General"}</Badge>
          <Badge variant={i.status === "open" ? "default" : "destructive"} className="shrink-0">
            {i.status === "open" ? "Open" : "Closed"}
          </Badge>
        </div>
        <CardTitle className="mt-2 line-clamp-2 text-base leading-snug">{i.title}</CardTitle>
        {i.shortDescription && (
          <CardDescription className="line-clamp-2 text-xs">{i.shortDescription}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pb-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" />
            <span>{i.duration || "Flexible"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Banknote className="size-3.5 shrink-0" />
            <span>{i.stipend || "Unpaid"}</span>
          </div>
          {i.seats > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" />
              <span>{i.seats} seat{i.seats !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {deadline && (
          <p className={`text-xs font-medium ${isDeadlineSoon ? "text-destructive" : "text-muted-foreground"}`}>
            Apply by {deadline.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        <div className="mt-auto pt-2">
          <Button size="sm" className="w-full" nativeButton={false} render={<Link href={`/careers/${i.id}`} />}>
            View Details <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
