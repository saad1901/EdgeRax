"use client"

import { useEffect, useState } from "react"
import { Users, BookOpen, ShoppingCart, IndianRupee, PieChart, GraduationCap, Share2, ChevronDown, ChevronRight } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminApi, type AdminStats } from "@/lib/api"
import { formatPrice } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const chartConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig

interface RevenueBreakdown {
  totalRevenue: number
  instructorCut: number
  referral: { paid: number; pending: number; total: number }
  shares: { id: string; name: string; designation: string; percentage: number; amount: number }[]
}

function pct(amount: number, total: number) {
  if (!total) return "0.00"
  return ((amount / total) * 100).toFixed(2)
}

export default function AdminDashboardPage() {
  const [stats,     setStats]     = useState<AdminStats | null>(null)
  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null)
  const [refExpanded, setRefExpanded] = useState(false)

  useEffect(() => {
    adminApi.stats().then(setStats).catch(console.error)
    fetch("/api/admin/revenue-breakdown", { credentials: "include" })
      .then((r) => r.json())
      .then(setBreakdown)
      .catch(console.error)
  }, [])

  if (!stats) return <AdminShell><div className="flex justify-center py-20"><Spinner className="size-8" /></div></AdminShell>

  const statCards = [
    { label: "Total Revenue",    value: formatPrice(stats.totalRevenue), icon: IndianRupee },
    { label: "Courses Sold",     value: String(stats.totalSold),         icon: ShoppingCart },
    { label: "Total Courses",    value: String(stats.totalCourses),      icon: BookOpen },
    { label: "Registered Users", value: String(stats.totalUsers),        icon: Users },
  ]

  const total = breakdown?.totalRevenue ?? 0

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform&apos;s performance.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs">{label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold sm:text-2xl">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Revenue Breakdown ── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <PieChart className="size-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Revenue Breakdown</CardTitle>
              <CardDescription>How total revenue is distributed</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {!breakdown ? (
              <div className="flex justify-center py-8"><Spinner className="size-5" /></div>
            ) : (
              <div className="divide-y">

                {/* Total revenue row */}
                <BreakdownRow
                  icon={<IndianRupee className="size-4" />}
                  label="Total Revenue"
                  sublabel="All course purchases"
                  pctStr="100.00%"
                  amount={total}
                  highlight
                />

                {/* Instructor cut */}
                <BreakdownRow
                  icon={<GraduationCap className="size-4" />}
                  label="Instructor Commissions"
                  sublabel="Sum of per-instructor commission rates"
                  pctStr={`${pct(breakdown.instructorCut, total)}%`}
                  amount={breakdown.instructorCut}
                />

                {/* Referral — collapsible, chevron before the amount */}
                <div>
                  <button
                    className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/40"
                    onClick={() => setRefExpanded((p) => !p)}
                  >
                    <span className="shrink-0 text-muted-foreground"><Share2 className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Referral Payouts</p>
                      <p className="text-xs text-muted-foreground">Credited + pending earnings</p>
                    </div>
                    {/* chevron before the numbers */}
                    {refExpanded
                      ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatPrice(breakdown.referral.total)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{pct(breakdown.referral.total, total)}%</p>
                    </div>
                  </button>

                  {refExpanded && (
                    <div className="border-t bg-muted/20">
                      <SubRow
                        label="Paid out (credited)"
                        amount={breakdown.referral.paid}
                        total={total}
                        className="text-green-700 dark:text-green-400"
                      />
                      <SubRow
                        label="Pending payment"
                        amount={breakdown.referral.pending}
                        total={total}
                        className="text-amber-600 dark:text-amber-400"
                      />
                    </div>
                  )}
                </div>

                {/* Revenue shares */}
                {breakdown.shares.length > 0 && breakdown.shares.map((share) => (
                  <BreakdownRow
                    key={share.id}
                    icon={<PieChart className="size-4" />}
                    label={share.name}
                    sublabel={share.designation || `${share.percentage.toFixed(2)}% share`}
                    pctStr={`${share.percentage.toFixed(2)}%`}
                    amount={share.amount}
                  />
                ))}

                {/* Platform profit — what's left after all deductions */}
                {(() => {
                  const totalDeducted =
                    breakdown.instructorCut +
                    breakdown.referral.total +
                    breakdown.shares.reduce((s, sh) => s + sh.amount, 0)
                  const profit = Math.round((total - totalDeducted) * 100) / 100
                  return (
                    <div className="border-t">
                      <BreakdownRow
                        icon={<IndianRupee className="size-4" />}
                        label="Platform Profit"
                        sublabel="Remaining after all deductions"
                        pctStr={`${pct(profit, total)}%`}
                        amount={profit}
                        highlight
                      />
                    </div>
                  )
                })()}

                <div className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Revenue by course</CardTitle>
              <CardDescription>Top courses by total revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.revenueByCourse.some((d) => d.revenue > 0) ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={stats.revenueByCourse} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No sales yet. Revenue will appear here as students enroll.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Latest course purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden md:table-cell">Course</TableHead>
                      <TableHead className="hidden sm:table-cell">Payment</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentPurchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <p>{p.userName}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{p.courseTitle}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-32 truncate text-muted-foreground">
                          {p.courseTitle}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="font-mono text-xs text-muted-foreground truncate block" title={p.paymentId}>
                            {p.paymentId}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {new Date(p.purchasedAt).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{formatPrice(p.amount)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function BreakdownRow({
  icon, label, sublabel, pctStr, amount, highlight = false,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  pctStr: string
  amount: number
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-6 py-3",
      highlight && "bg-muted/30 font-semibold",
    )}>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", highlight ? "font-semibold" : "font-medium")}>{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{formatPrice(amount)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{pctStr}</p>
      </div>
    </div>
  )
}

function SubRow({
  label, amount, total, className,
}: {
  label: string
  amount: number
  total: number
  className?: string
}) {
  return (
    <div className="flex items-center gap-3 pl-14 pr-6 py-2">
      <p className={cn("flex-1 text-xs font-medium", className)}>{label}</p>
      <div className="shrink-0 text-right">
        <p className={cn("text-xs font-semibold tabular-nums", className)}>{formatPrice(amount)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {pct(amount, total)}%
        </p>
      </div>
    </div>
  )
}
