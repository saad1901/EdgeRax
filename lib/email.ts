/**
 * Email sending via Nodemailer using SMTP credentials from environment variables.
 * All sending goes through this single module so transporter is created once.
 */
import nodemailer from "nodemailer"

function createTransporter() {
  const host     = process.env.SMTP_HOST
  const port     = Number(process.env.SMTP_PORT ?? 587)
  const secure   = process.env.SMTP_SECURE === "true"
  const user     = process.env.SMTP_USER
  const pass     = process.env.SMTP_PASSWORD
  const from     = process.env.SMTP_FROM ?? user ?? "noreply@example.com"

  if (!host || !user || !pass) {
    console.warn("[email] SMTP not configured — SMTP_HOST, SMTP_USER, SMTP_PASSWORD required")
    return null
  }

  return {
    transporter: nodemailer.createTransport({ host, port, secure, auth: { user, pass } }),
    from,
  }
}

export interface MailOptions {
  to:          string | string[]
  subject:     string
  html:        string
  /** Optional array of { filename, path } or { filename, content (Buffer) } */
  attachments?: { filename: string; path?: string; content?: Buffer }[]
}

/**
 * Send a single email. Returns true on success, false on failure.
 * Never throws — failures are only logged.
 */
export async function sendMail(opts: MailOptions): Promise<boolean> {
  const setup = createTransporter()
  if (!setup) return false
  try {
    await setup.transporter.sendMail({
      from:        setup.from,
      to:          Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject:     opts.subject,
      html:        opts.html,
      attachments: opts.attachments,
    })
    return true
  } catch (err) {
    console.error("[email] Send failed:", err)
    return false
  }
}

/**
 * Send the same email to multiple recipients individually (BCC-style —
 * each recipient only sees their own address).
 * Returns number of successful sends.
 */
export async function sendBulkMail(
  recipients: string[],
  subject: string,
  html: string,
  attachments?: MailOptions["attachments"],
): Promise<number> {
  const setup = createTransporter()
  if (!setup) return 0
  let sent = 0
  for (const to of recipients) {
    try {
      await setup.transporter.sendMail({
        from:  setup.from,
        to,
        subject,
        html,
        attachments,
      })
      sent++
    } catch (err) {
      console.error(`[email] Failed to send to ${to}:`, err)
    }
  }
  return sent
}

/** Replace template variables: {{name}}, {{email}}, {{course}} etc. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
