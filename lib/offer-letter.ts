import fs from "fs"
import path from "path"
import PDFDocument from "pdfkit"
import { sendMail } from "@/lib/email"
import { formatPrice } from "@/lib/format"

const OFFER_DIR = path.join(process.cwd(), "storage", "offer-letters")

export interface OfferLetterData {
  applicationId: string
  applicantName: string
  applicantEmail: string
  internshipTitle: string
  domain?: string
  duration?: string
  stipend?: string
  joiningFee?: number
  startDate?: string | null
  adminNote?: string
}

/**
 * Generates an Offer Letter PDF and saves it to storage/offer-letters.
 * Returns the relative file URL (/api/offer-letter/[appId]).
 */
export async function generateOfferLetterPdf(data: OfferLetterData): Promise<string> {
  fs.mkdirSync(OFFER_DIR, { recursive: true })
  const filePath = path.join(OFFER_DIR, `offer-${data.applicationId}.pdf`)

  return new Promise((resolve, reject) => {
    const doc: any = new PDFDocument({ margin: 50, size: "A4" })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    const primaryColor = "#4F46E5" // Indigo
    const textColor = "#1E293B"
    const mutedColor = "#64748B"

    // Header Background Accent
    doc.rect(0, 0, doc.page.width, 140).fill("#F8FAFC")

    // Brand Name & Title
    doc.fillColor(primaryColor).fontSize(26).font("Helvetica-Bold").text("EDGERAX", 50, 45)
    doc.fillColor(mutedColor).fontSize(10).font("Helvetica").text("Empowering Tech Careers & Innovation", 50, 75)
    doc.text("www.edgerax.com | careers@edgerax.com", 50, 90)

    // Document Title
    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text("OFFER OF INTERNSHIP", 350, 45, { align: "right" })
    const issueDate = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    doc.fillColor(mutedColor).fontSize(9).font("Helvetica").text(`Date: ${issueDate}`, 350, 70, { align: "right" })
    doc.text(`Ref: EDG/INT/${data.applicationId.slice(-8).toUpperCase()}`, 350, 85, { align: "right" })

    // Divider
    doc.moveTo(50, 140).lineTo(doc.page.width - 50, 140).strokeColor("#E2E8F0").lineWidth(1).stroke()

    // Recipient Info
    let y = 165
    doc.fillColor(textColor).fontSize(11).font("Helvetica-Bold").text("To,", 50, y)
    y += 18
    doc.fontSize(14).font("Helvetica-Bold").text(data.applicantName, 50, y)
    y += 18
    doc.fillColor(mutedColor).fontSize(10).font("Helvetica").text(`Email: ${data.applicantEmail}`, 50, y)

    // Salutation & Body
    y += 35
    doc.fillColor(textColor).fontSize(12).font("Helvetica-Bold").text(`Dear ${data.applicantName},`, 50, y)
    y += 22
    doc.fontSize(10).font("Helvetica").lineGap(4).text(
      `We are pleased to extend this official Offer of Internship for the position of "${data.internshipTitle}" at Edgerax. ` +
      `Our selection team was thoroughly impressed by your profile and qualifications. We believe your experience with us will be mutually rewarding and educational.`,
      50, y, { width: doc.page.width - 100 }
    )

    y = doc.y + 20

    // Key Internship Terms Box
    doc.rect(50, y, doc.page.width - 100, 145).fillAndStroke("#F1F5F9", "#CBD5E1")
    const boxY = y + 15
    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("INTERNSHIP DETAILS & TERMS", 65, boxY)

    doc.fillColor(textColor).fontSize(10).font("Helvetica")
    const leftColX = 65
    const rightColX = 300
    let termY = boxY + 22

    // Row 1
    doc.font("Helvetica-Bold").text("Position / Title:", leftColX, termY)
    doc.font("Helvetica").text(data.internshipTitle, leftColX + 90, termY)
    if (data.domain) {
      doc.font("Helvetica-Bold").text("Domain:", rightColX, termY)
      doc.font("Helvetica").text(data.domain, rightColX + 60, termY)
    }

    // Row 2
    termY += 20
    doc.font("Helvetica-Bold").text("Duration:", leftColX, termY)
    doc.font("Helvetica").text(data.duration || "Flexible / Standard", leftColX + 90, termY)
    doc.font("Helvetica-Bold").text("Stipend:", rightColX, termY)
    doc.font("Helvetica").text(data.stipend || "Unpaid / Experience based", rightColX + 60, termY)

    // Row 3
    termY += 20
    doc.font("Helvetica-Bold").text("Start Date:", leftColX, termY)
    doc.font("Helvetica").text(data.startDate ? new Date(data.startDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Immediate upon acceptance", leftColX + 90, termY)

    const joiningFeeVal = Number(data.joiningFee || 0)
    doc.font("Helvetica-Bold").text("Joining Fee:", rightColX, termY)
    doc.font("Helvetica").text(joiningFeeVal > 0 ? formatPrice(joiningFeeVal) : "Nil (Free)", rightColX + 70, termY)

    // Row 4 (Note on Joining Fee)
    termY += 22
    if (joiningFeeVal > 0) {
      doc.fillColor("#B45309").fontSize(9).font("Helvetica-Oblique").text(
        `* Note: A one-time joining/onboarding fee of ${formatPrice(joiningFeeVal)} is set for this role to cover program resources & mentorship.`,
        leftColX, termY, { width: doc.page.width - 130 }
      )
    } else {
      doc.fillColor(mutedColor).fontSize(9).font("Helvetica-Oblique").text(
        `* Note: No joining or registration fee is required for this internship position.`,
        leftColX, termY, { width: doc.page.width - 130 }
      )
    }

    y = y + 160

    // Expectations Paragraph
    doc.fillColor(textColor).fontSize(10).font("Helvetica").lineGap(4).text(
      "As an intern at Edgerax, you will work on hands-on practical tasks, participate in code/project reviews, " +
      "and collaborate with our engineering team. Upon successful completion of your internship and tasks, you will receive a verifiable Certificate of Completion.",
      50, y, { width: doc.page.width - 100 }
    )

    y = doc.y + 15
    if (data.adminNote) {
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("Special Note from Hiring Manager:", 50, y)
      y += 15
      doc.fillColor(textColor).fontSize(9).font("Helvetica-Oblique").text(`"${data.adminNote}"`, 60, y, { width: doc.page.width - 120 })
      y = doc.y + 15
    }

    // Acceptance Instructions
    doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold").text("Next Steps & Acceptance:", 50, y)
    y += 16
    doc.fontSize(9.5).font("Helvetica").lineGap(3).text(
      "To accept this offer, please log into your Edgerax account and visit 'My Internships' dashboard to confirm your offer" +
      (joiningFeeVal > 0 ? ` and complete the joining fee of ${formatPrice(joiningFeeVal)}.` : "."),
      50, y, { width: doc.page.width - 100 }
    )

    // Sign-off
    y = doc.y + 35
    doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold").text("Sincerely,", 50, y)
    y += 18
    doc.fontSize(11).font("Helvetica-Bold").fillColor(primaryColor).text("Edgerax Talent & Careers Team", 50, y)
    doc.fontSize(9).font("Helvetica").fillColor(mutedColor).text("Edgerax Learning Systems", 50, y + 14)

    // Footer
    const footerY = doc.page.height - 45
    doc.moveTo(50, footerY - 10).lineTo(doc.page.width - 50, footerY - 10).strokeColor("#E2E8F0").stroke()
    doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text(
      "This is a system-generated document issued by Edgerax. Verification ID: " + data.applicationId,
      50, footerY, { align: "center", width: doc.page.width - 100 }
    )

    doc.end()

    stream.on("finish", () => resolve(`/api/offer-letter/${data.applicationId}`))
    stream.on("error", (err) => reject(err))
  })
}

/**
 * Sends an automated Offer Letter email to the candidate.
 */
export async function sendOfferLetterEmail(data: OfferLetterData, appUrl: string): Promise<boolean> {
  try {
    // Ensure PDF is generated
    const pdfPath = path.join(OFFER_DIR, `offer-${data.applicationId}.pdf`)
    if (!fs.existsSync(filePath(data.applicationId))) {
      await generateOfferLetterPdf(data)
    }

    const joiningFeeVal = Number(data.joiningFee || 0)
    const actionUrl = `${appUrl}/my-internships`

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #3b82f6); padding: 32px 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Congratulations! 🎉</h1>
          <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">You have received an Internship Offer from Edgerax</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; font-weight: 600; color: #0f172a;">Dear ${data.applicantName},</p>
          <p>We are excited to inform you that your application for <strong>${data.internshipTitle}</strong> has been selected!</p>
          
          <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Position:</strong> ${data.internshipTitle}</p>
            <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Duration:</strong> ${data.duration || "Standard"}</p>
            <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Stipend:</strong> ${data.stipend || "Unpaid"}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Joining Fee:</strong> ${joiningFeeVal > 0 ? formatPrice(joiningFeeVal) : "Free"}</p>
          </div>
          
          ${joiningFeeVal > 0 ? `
            <p style="font-size: 14px; color: #b45309; background: #fffbeb; padding: 12px 16px; border-radius: 8px; border: 1px solid #fef3c7;">
              <strong>Action Required:</strong> A joining fee of <strong>${formatPrice(joiningFeeVal)}</strong> is set for enrollment. Please visit your dashboard to pay and confirm your acceptance.
            </p>
          ` : `
            <p style="font-size: 14px; color: #047857; background: #ecfdf5; padding: 12px 16px; border-radius: 8px; border: 1px solid #a7f3d0;">
              Please visit your dashboard to review and confirm your acceptance.
            </p>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; font-size: 15px;">
              View Offer & Respond
            </a>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">Your official Offer Letter PDF is attached to this email for your records.</p>
        </div>
        
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
          Edgerax Learning Systems &bull; careers@edgerax.com
        </div>
      </div>
    `

    const pdfBuffer = fs.readFileSync(pdfPath)

    return await sendMail({
      to: data.applicantEmail,
      subject: `Internship Offer: ${data.internshipTitle} - Edgerax`,
      html: htmlBody,
      attachments: [
        {
          filename: `Offer_Letter_${data.internshipTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  } catch (err) {
    console.error("[sendOfferLetterEmail]", err)
    return false
  }
}

function filePath(appId: string) {
  return path.join(OFFER_DIR, `offer-${appId}.pdf`)
}
