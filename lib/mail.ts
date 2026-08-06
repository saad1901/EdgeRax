import nodemailer from "nodemailer"

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required to send password reset emails.`)
  return value
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character]!)
}

export function getAppUrl() {
  const configured = required("APP_URL")
  const url = new URL(configured)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("APP_URL must be an http:// or https:// URL.")
  }
  return url.origin
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string
  name: string
  resetUrl: string
}) {
  const port = Number(process.env.SMTP_PORT ?? 465)
  if (!Number.isInteger(port) || port <= 0) throw new Error("SMTP_PORT must be a valid port number.")

  const user = required("SMTP_USER")
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.hostinger.com",
    port,
    secure: process.env.SMTP_SECURE == null ? port === 465 : process.env.SMTP_SECURE === "true",
    auth: { user, pass: required("SMTP_PASSWORD") },
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(resetUrl)
  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || `Edgerax <${user}>`,
    to,
    subject: "Reset your Edgerax password",
    text: [
      `Hello ${name},`,
      "",
      "We received a request to reset your Edgerax password.",
      `Reset it here: ${resetUrl}`,
      "",
      "This link expires in 30 minutes and can only be used once.",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#202124;line-height:1.6">
        <h2 style="color:#111827">Reset your Edgerax password</h2>
        <p>Hello ${safeName},</p>
        <p>We received a request to reset your Edgerax password.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Reset password</a>
        </p>
        <p>This link expires in 30 minutes and can only be used once.</p>
        <p style="color:#6b7280;font-size:14px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  })
}
