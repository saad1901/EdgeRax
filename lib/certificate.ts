import fs from "fs"
import path from "path"
import PDFDocument from "pdfkit"

// ─── Certificate number ───────────────────────────────────────────────────────

export function makeCertificateNumber(): string {
  const year   = new Date().getFullYear()
  const suffix = String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0")
  return `EDG-${year}-${suffix}`
}

export interface CertificateOptions {
  certificateId:     string
  certificateNumber: string
  studentName:       string
  courseName:        string
  issuedAt:          string
}

// ─── PDF generation ──────────────────────────────────────────────────────────

export async function generateCertificatePdf(opts: CertificateOptions): Promise<string> {
  const outDir = process.env.STORAGE_PATH
    ? path.join(path.resolve(process.env.STORAGE_PATH), "certificates")
    : path.join(process.cwd(), "storage", "certificates")
  await fs.promises.mkdir(outDir, { recursive: true })
  const filePath = path.join(outDir, `${opts.certificateId}.pdf`)

  // A4 width, ~60% height — not a full page, more like a compact card
  const W = 595.28
  const H = 500

  const BLACK      = "#111111"
  const DARK_GREY  = "#444444"
  const MID_GREY   = "#777777"
  const LIGHT_GREY = "#CCCCCC"
  const ACCENT     = "#76b900"   // Edgerax green (adjust to your brand colour)
  const WHITE      = "#FFFFFF"

  const MARGIN     = 52          // left/right margin
  const ACCENT_W   = 7           // left accent bar width
  const CONTENT_X  = MARGIN + 16 // text starts here

  const issueDate = new Date(opts.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })

  const logoPath = path.join(process.cwd(), "public", "logo.png")
  const hasLogo  = fs.existsSync(logoPath)

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({
      size:          [W, H],
      margin:        0,
      autoFirstPage: true,
    } as any) as any

    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // ── White background ──────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill(WHITE)

    // ── Thin outer border ─────────────────────────────────────────────────
    doc.rect(10, 10, W - 20, H - 20)
       .lineWidth(0.8)
       .strokeColor(LIGHT_GREY)
       .stroke()

    // ── Left accent bar ───────────────────────────────────────────────────
    doc.rect(MARGIN, 48, ACCENT_W, 160)
       .fill(ACCENT)

    // ── Logo + pipe + company name ────────────────────────────────────────
    const LOGO_Y = 52
    const LOGO_H = 36
    let logoRight = CONTENT_X // tracks x position after logo

    if (hasLogo) {
      try {
        doc.roundedRect(CONTENT_X, LOGO_Y, LOGO_H, LOGO_H, 5).fill("#000000")
        doc.image(logoPath, CONTENT_X + 3, LOGO_Y + 3, { height: LOGO_H - 6, width: LOGO_H - 6 })
        // Approximate rendered width from aspect ratio; LOGO_H = 36
        logoRight = CONTENT_X + 36 // square-ish logo; adjust if needed
      } catch {
        doc.font("Helvetica-Bold").fontSize(18).fillColor(ACCENT)
           .text("Edgerax", CONTENT_X, LOGO_Y + 9)
        logoRight = CONTENT_X + 65
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(ACCENT)
         .text("Edgerax", CONTENT_X, LOGO_Y + 9)
      logoRight = CONTENT_X + 65
    }

    // Pipe separator
    const PIPE_X = logoRight + 10
    const PIPE_TOP = LOGO_Y + 4
    const PIPE_BOT = LOGO_Y + LOGO_H - 4
    doc.moveTo(PIPE_X, PIPE_TOP)
       .lineTo(PIPE_X, PIPE_BOT)
       .lineWidth(1.2)
       .strokeColor(DARK_GREY)
       .stroke()

    // Company name next to pipe
    doc.font("Helvetica-Bold")
       .fontSize(16)
       .fillColor(BLACK)
       .text("Edgerax", PIPE_X + 10, LOGO_Y + 10)

    // ── Certificate of Completion heading ─────────────────────────────────
    doc.font("Helvetica-Bold")
       .fontSize(22)
       .fillColor(BLACK)
       .text("Certificate of Completion", CONTENT_X, LOGO_Y + LOGO_H + 18, {
         width: W - CONTENT_X - MARGIN,
       })

    // ── Thin separator line ───────────────────────────────────────────────
    const SEP_Y = LOGO_Y + LOGO_H + 54
    doc.moveTo(CONTENT_X, SEP_Y)
       .lineTo(W - MARGIN, SEP_Y)
       .lineWidth(0.6)
       .strokeColor(LIGHT_GREY)
       .stroke()

    // ── "This certificate is awarded to" ─────────────────────────────────
    doc.font("Helvetica")
       .fontSize(12)
       .fillColor(DARK_GREY)
       .text("This certificate is awarded to", CONTENT_X, SEP_Y + 20, {
         width: W - CONTENT_X - MARGIN,
       })

    // ── Student name ──────────────────────────────────────────────────────
    doc.font("Helvetica-Bold")
       .fontSize(38)
       .fillColor(BLACK)
       .text(opts.studentName, CONTENT_X, SEP_Y + 40, {
         width: W - CONTENT_X - MARGIN,
         lineGap: 3,
       })

    const nameHeight = doc.heightOfString(opts.studentName, {
      font: "Helvetica-Bold",
      fontSize: 38,
      width: W - CONTENT_X - MARGIN,
      lineGap: 3,
    })
    const AFTER_NAME_Y = SEP_Y + 40 + nameHeight + 14

    // ── "for demonstrating competence in the completion of" ───────────────
    doc.font("Helvetica")
       .fontSize(12)
       .fillColor(DARK_GREY)
       .text("for demonstrating competence in the completion of", CONTENT_X, AFTER_NAME_Y, {
         width: W - CONTENT_X - MARGIN,
       })

    // ── Course name ───────────────────────────────────────────────────────
    doc.font("Helvetica-Bold")
       .fontSize(14)
       .fillColor(BLACK)
       .text(opts.courseName, CONTENT_X, AFTER_NAME_Y + 20, {
         width: W - CONTENT_X - MARGIN,
         lineGap: 2,
       })

    // ── Bottom-right metadata ─────────────────────────────────────────────
    const META_Y = H - MARGIN - 52
    doc.font("Helvetica")
       .fontSize(9)
       .fillColor(MID_GREY)
       .text(`Issue Date :  ${issueDate}`, 0, META_Y, {
         align: "right",
         width: W - MARGIN,
       })
    doc.font("Helvetica")
       .fontSize(9)
       .fillColor(MID_GREY)
       .text(`Certification ID:  ${opts.certificateNumber}`, 0, META_Y + 16, {
         align: "right",
         width: W - MARGIN,
       })
    doc.font("Helvetica")
       .fontSize(9)
       .fillColor(ACCENT)
       .text("www.edgerax.com", 0, META_Y + 32, {
         align: "right",
         width: W - MARGIN,
       })

    doc.end()
    stream.on("finish", () => resolve(filePath))
    stream.on("error",  (err: Error) => reject(err))
  })
}
