"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Download, Award } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "sonner"

interface AdminCertificate {
  id:                string
  userId:            string
  courseId:          string
  certificateName:   string
  certificateNumber: string
  issuedAt:          string
  pdfPath:           string
  studentName:       string
  studentEmail:      string
  courseTitle:       string
}

export default function AdminCertificatesPage() {
  const [certs, setCerts]     = useState<AdminCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState("")
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchCerts = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const url = q.trim()
        ? `/api/admin/certificates?q=${encodeURIComponent(q.trim())}`
        : "/api/admin/certificates"
      const res = await fetch(url, { credentials: "include" })
      const data = await res.json()
      setCerts(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Failed to load certificates.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCerts("")
  }, [fetchCerts])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchCerts(query), 300)
    return () => clearTimeout(t)
  }, [query, fetchCerts])

  async function handleDownload(cert: AdminCertificate) {
    setDownloading(cert.id)
    try {
      const res = await fetch(`/api/certificates/${cert.id}/download`, { credentials: "include" })
      if (!res.ok) { toast.error("Download failed."); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `certificate-${cert.certificateNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed.")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">View and download all issued completion certificates.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student, course, or certificate no."
            className="pl-9"
          />
        </div>

        {/* Summary badge */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {certs.length} certificate{certs.length !== 1 ? "s" : ""}{query ? " matching your search" : " total"}
          </p>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : certs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Award /></EmptyMedia>
              <EmptyTitle>No certificates found</EmptyTitle>
              <EmptyDescription>
                {query ? "Try a different search term." : "No certificates have been issued yet."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="hidden md:table-cell">Certificate No.</TableHead>
                  <TableHead className="hidden lg:table-cell">Name on Certificate</TableHead>
                  <TableHead className="hidden sm:table-cell">Issued</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <p className="font-medium">{cert.studentName}</p>
                      <p className="text-xs text-muted-foreground">{cert.studentEmail}</p>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                      {cert.courseTitle}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="font-mono text-xs">
                        {cert.certificateNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {cert.certificateName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(cert)}
                        disabled={downloading === cert.id}
                        aria-label={`Download certificate for ${cert.studentName}`}
                      >
                        {downloading === cert.id
                          ? <Spinner className="size-3.5" />
                          : <Download className="size-3.5" />}
                        <span className="sr-only">Download</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
