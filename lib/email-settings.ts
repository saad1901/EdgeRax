import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export interface EmailSettings {
  on_login:    boolean
  on_signup:   boolean
  on_purchase: boolean
  templates: {
    login:    { subject: string; body: string }
    signup:   { subject: string; body: string }
    purchase: { subject: string; body: string }
  }
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  on_login:    false,
  on_signup:   true,
  on_purchase: true,
  templates: {
    login: {
      subject: "New login to your account",
      body: "<p>Hi {{name}},</p><p>We noticed a new login to your account. If this wasn't you, please change your password immediately.</p>",
    },
    signup: {
      subject: "Welcome to Edgerax, {{name}}!",
      body: "<p>Hi {{name}},</p><p>Welcome! Your account has been created successfully.</p><p>Start exploring our courses and begin your learning journey today.</p><p><a href='{{link}}' style='background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px'>Browse Courses</a></p>",
    },
    purchase: {
      subject: "You're enrolled in {{course}}!",
      body: "<p>Hi {{name}},</p><p>Thank you for enrolling in <strong>{{course}}</strong>.</p><p><a href='{{link}}' style='background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px'>Go to Course</a></p>",
    },
  },
}

const KEY = "email_settings"

export async function getEmailSettingsFromDb(): Promise<EmailSettings> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY))
  if (!rows[0]) return DEFAULT_EMAIL_SETTINGS
  try {
    const stored = JSON.parse(rows[0].value)
    return {
      on_login:    stored.on_login    ?? DEFAULT_EMAIL_SETTINGS.on_login,
      on_signup:   stored.on_signup   ?? DEFAULT_EMAIL_SETTINGS.on_signup,
      on_purchase: stored.on_purchase ?? DEFAULT_EMAIL_SETTINGS.on_purchase,
      templates: {
        login:    { ...DEFAULT_EMAIL_SETTINGS.templates.login,    ...(stored.templates?.login    ?? {}) },
        signup:   { ...DEFAULT_EMAIL_SETTINGS.templates.signup,   ...(stored.templates?.signup   ?? {}) },
        purchase: { ...DEFAULT_EMAIL_SETTINGS.templates.purchase, ...(stored.templates?.purchase ?? {}) },
      },
    }
  } catch {
    return DEFAULT_EMAIL_SETTINGS
  }
}
