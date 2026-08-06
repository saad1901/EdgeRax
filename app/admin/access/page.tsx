"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Lock, BookOpen, Users, Settings, MessageSquare, BarChart2, Share2, CheckCircle2, AlertCircle, Search } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { adminApi, type AdminStudent } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"

const ADMIN_FEATURES = [
  {
    category: "Course Management",
    icon: BookOpen,
    features: [
      "Create, edit, and delete courses",
      "Manage chapters and lessons",
      "Upload and manage videos and PDFs",
      "Set course pricing and validity",
    ],
  },
  {
    category: "Student Management",
    icon: Users,
    features: [
      "View all registered students",
      "Search and filter students",
      "Give students free course access (giveaways)",
      "Reset student passwords",
    ],
  },
  {
    category: "Community Control",
    icon: MessageSquare,
    features: [
      "Delete community posts",
      "Remove chat messages",
      "Post announcements to the community",
      "Manage community access and memberships",
    ],
  },
  {
    category: "Financial & Referrals",
    icon: BarChart2,
    features: [
      "View all platform statistics and revenue",
      "Manage referral settings and rewards",
      "Process student withdrawals",
      "Track referral earnings",
    ],
  },
  {
    category: "System Settings",
    icon: Settings,
    features: [
      "Update site contact information",
      "Manage site-wide settings",
      "View platform analytics",
      "Grant admin access to other users",
    ],
  },
]

export default function AdminAccessPage() {
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [grantingAdmin, setGrantingAdmin] = useState<string | null>(null)

  async function loadStudents() {
    try {
      const data = await adminApi.listStudents()
      setStudents(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  async function handleGrantAdmin(studentId: string) {
    setGrantingAdmin(studentId)
    try {
      toast.success("Admin access granted. (Feature in development)")
    } catch (error) {
      console.error(error)
      toast.error("Failed to grant admin access")
    } finally {
      setGrantingAdmin(null)
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="size-8 text-primary" /> Admin Access Control
          </h1>
          <p className="mt-2 text-muted-foreground">
            View your admin capabilities and manage other admins. Admins have full platform access by default.
          </p>
        </div>

        {/* Admin Features Overview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Admin Capabilities</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ADMIN_FEATURES.map(({ category, icon: Icon, features }) => (
              <Card key={category} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-5 text-primary" /> {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Access Control Summary */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" /> Access Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Platform Access Level</span>
              <Badge variant="default" className="gap-2">
                <ShieldCheck className="size-3" /> Full Admin
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              You have unrestricted access to all platform features. You can manage courses, students, community content, financial settings, and other admin controls.
            </p>
          </CardContent>
        </Card>

        {/* Manage Other Admins */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Manage Admins</h2>
          <Card>
            <CardHeader>
              <CardDescription>
                Grant or revoke admin access to students. Once granted, they can manage all platform features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search students by name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="size-6" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                  <Users className="size-8 opacity-40" />
                  <p className="font-medium">{query ? "No students found" : "No students available"}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{student.email}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="gap-1">
                              <Lock className="size-3" /> Regular User
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrantAdmin(student.id)}
                              disabled={grantingAdmin === student.id}
                            >
                              {grantingAdmin === student.id ? "Granting…" : "Grant Admin"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Important Notes */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertCircle className="size-5" /> Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <p>• Admins have unrestricted access to all platform features by default.</p>
            <p>• Be careful when granting admin access — admins can manage all aspects of the platform.</p>
            <p>• Only grant admin status to trusted users who will help manage the platform.</p>
            <p>• Admins cannot be reverted to regular users through this interface yet.</p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
