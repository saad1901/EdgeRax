"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface ReceiptData {
  id: string
  receiptNo: string
  transactionId?: string | null
  amount: number
  createdAt: string
  withdrawalId: string
  userId: string
  adminId: string
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/receipts/${params.id}`, { credentials: "include" })
        if (!res.ok) throw new Error("Receipt not found")
        const data = await res.json()
        setReceipt(data)
      } catch {
        setReceipt(null)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner className="size-8" /></div>
  }

  if (!receipt) {
    return <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">Receipt not found.</div>
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 print:bg-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">Edgerax</p>
            <h1 className="text-2xl font-bold text-foreground">Referral Payment Receipt</h1>
            <p className="text-sm text-muted-foreground">Official payout confirmation from Edgerax</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <a href={`/api/receipts/${receipt.id}`} target="_blank" rel="noopener noreferrer">
              <Button>Download PDF</Button>
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-muted-foreground/30 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Company</p>
              <h2 className="text-2xl font-bold text-foreground">Edgerax</h2>
              <p className="text-sm text-muted-foreground">Website: www.edgerax.com</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">Status</p>
              <p className="text-lg font-semibold text-emerald-700">Paid</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Receipt Number</p>
              <p className="mt-1 text-lg font-semibold">{receipt.receiptNo}</p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Payment Date</p>
                  <p className="mt-1 font-medium">{new Date(receipt.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Amount Paid</p>
                  <p className="mt-1 text-3xl font-bold text-primary">₹{Number(receipt.amount).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Payment Details</p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction / UTR</p>
                  <p className="font-medium">{receipt.transactionId || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Withdrawal ID</p>
                  <p className="font-medium">{receipt.withdrawalId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout Type</p>
                  <p className="font-medium">Referral Commission</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>This is a system-generated confirmation of the referral payout issued by Edgerax.</p>
            <p className="mt-1">For support, contact us at support@edgerax.com or visit www.edgerax.com.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
