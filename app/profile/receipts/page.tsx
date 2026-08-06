"use client"

import { useEffect, useState } from "react"
import { receiptsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function ReceiptsPage() {
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<any[]>([])

  useEffect(() => {
    receiptsApi.list().then(setReceipts).catch(() => setReceipts([])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="size-8" /></div>

  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Referral Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-muted-foreground">No receipts yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {receipts.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                  <div>
                    <div className="font-medium">{r.receiptNo}</div>
                    <div className="text-sm text-muted-foreground">
                      Paid on {new Date(r.createdAt).toLocaleString()} — ₹{Number(r.amount).toFixed(2)}
                    </div>
                    {r.transactionId && (
                      <div className="text-xs text-muted-foreground">UTR: {r.transactionId}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/receipts/${r.id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </a>
                    <a href={`/api/receipts/${r.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm">Download</Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
