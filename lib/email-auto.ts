/**
 * Auto-email helper — reads email settings from the DB and sends
 * the appropriate template when triggered by a system event.
 * All calls are fire-and-forget; failures are logged but never rethrown.
 */
import { db } from "./db"
import { siteSettings } from "./db/schema"
import { eq } from "drizzle-orm"
import { sendMail, renderTemplate } from "./email"

export type Trigger = "login" | "signup" | "purchase"

interface EmailSettings {
  on_login:    boolean
  on_signup:   boolean
  on_purchase: boolean
  templates: {
    login:    { subject: string; body: string }
    signup:   { subject: string; body: string }
    purchase: { subject: string; body: string }
  }
}

const DEFAULTS: EmailSettings = {
  on_login: false,
  on_signup: true,
  on_purchase: true,
  templates: {
    login:    { subject: "New login to your account",      body: "<p>Hi {{name}},</p><p>A new login was detected on your account.</p>" },
    signup:   { subject: "Welcome to Edgerax, {{name}}!", body: "<p>Hi {{name}},</p><p>Your account has been created. Welcome!</p>" },
    purchase: { subject: "You're enrolled in {{course}}!", body: "<p>Hi {{name}},</p><p>Thank you for enrolling in <strong>{{course}}</strong>.</p>" },
  },
}

async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "email_settings"))
    if (!rows[0]) return DEFAULTS
    const stored = JSON.parse(rows[0].value)
    return {
      on_login:    stored.on_login    ?? DEFAULTS.on_login,
      on_signup:   stored.on_signup   ?? DEFAULTS.on_signup,
      on_purchase: stored.on_purchase ?? DEFAULTS.on_purchase,
      templates: {
        login:    { ...DEFAULTS.templates.login,    ...(stored.templates?.login    ?? {}) },
        signup:   { ...DEFAULTS.templates.signup,   ...(stored.templates?.signup   ?? {}) },
        purchase: { ...DEFAULTS.templates.purchase, ...(stored.templates?.purchase ?? {}) },
      },
    }
  } catch {
    return DEFAULTS
  }
}

export async function sendAutoEmail(
  trigger: Trigger,
  vars: Record<string, string>,
): Promise<void> {
  try {
    const cfg = await getEmailSettings()

    const enabled =
      trigger === "login"    ? Boolean(cfg.on_login)    :
      trigger === "signup"   ? Boolean(cfg.on_signup)   :
      Boolean(cfg.on_purchase)

    if (!enabled) {
      console.log(`[email-auto] Trigger "${trigger}" is disabled — skipping`)
      return
    }

    const tpl = cfg.templates[trigger]
    if (!tpl?.subject || !tpl?.body) {
      console.warn(`[email-auto] Template for "${trigger}" is missing subject or body`)
      return
    }

    const to = vars.email
    if (!to) {
      console.warn("[email-auto] No email address in vars — skipping")
      return
    }

    console.log(`[email-auto] Sending "${trigger}" email to ${to}`)
    const ok = await sendMail({
      to,
      subject: renderTemplate(tpl.subject, vars),
      html:    renderTemplate(tpl.body,    vars),
    })
    console.log(`[email-auto] "${trigger}" email ${ok ? "sent" : "FAILED"} → ${to}`)
  } catch (err) {
    console.error("[email-auto] Unexpected error:", err)
  }
}
