import fs from "fs"
import path from "path"
import PDFDocument from "pdfkit"

export async function generateReceiptPdf(opts: {
  receiptId: string
  receiptNo: string
  withdrawalId: string
  transactionId?: string | null
  amount: number
  userName: string
  userEmail: string
  userPhone?: string | null
  upiId: string
  paymentMethod: string
  adminName: string
}) {
  const outDir = path.join(process.cwd(), "storage", "referral_receipts")
  await fs.promises.mkdir(outDir, { recursive: true })
  const filename = `${opts.receiptId}.pdf`
  const filePath = path.join(outDir, filename)

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 }) as any
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // Header: logo and title
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    if (fs.existsSync(logoPath)) {
      try {
        doc.rect(40, 45, 80, 80).fill("#000000")
        doc.image(logoPath, 46, 51, { width: 68, height: 68 })
      } catch (e) { /* ignore */ }
    }
    doc.fontSize(20).text("Edgerax", 140, 50)
    doc.fontSize(10).fillColor("gray").text(`Receipt No: ${opts.receiptNo}`, { align: "right" })
    doc.moveDown(2)

    doc.fontSize(14).fillColor("black").text("Referral Payment Receipt", { align: "center" })
    doc.moveDown(1)

    // Payment + user info
    const leftX = 40
    const rightX = 320
    doc.fontSize(10)
    doc.text(`Withdrawal ID: ${opts.withdrawalId}`, leftX, doc.y)
    doc.text(`Transaction/UTR: ${opts.transactionId ?? "-"}`, rightX, doc.y)
    doc.moveDown(0.5)
    doc.text(`Payment Date: ${new Date().toLocaleString()}`, leftX)
    doc.text(`Payment Method: ${opts.paymentMethod}`, rightX)
    doc.moveDown(1)

    doc.text(`Payer: ${opts.userName}`)
    doc.text(`Email: ${opts.userEmail}`)
    if (opts.userPhone) doc.text(`Phone: ${opts.userPhone}`)
    doc.moveDown(0.5)
    doc.text(`UPI ID: ${opts.upiId}`)
    doc.moveDown(1)

    // Amounts
    doc.fontSize(12).text(`Referral Earnings Paid: ₹${opts.amount.toFixed(2)}`, { continued: false })
    doc.moveDown(1)

    // Footer
    doc.moveDown(4)
    doc.fontSize(10).fillColor("gray").text(`Approved by: ${opts.adminName}`)
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor("black").text("Thank you — this is a system-generated confirmation of the referral payout issued by Edgerax.")

    doc.end()

    stream.on("finish", () => resolve(filePath))
    stream.on("error", (err) => reject(err))
  })
}

export function makeReceiptNo() {
  // Simple human-friendly receipt number
  const now = new Date()
  return `R-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}
