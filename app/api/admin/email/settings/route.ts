import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import {
  getEmailSettingsFromDb,
  type EmailSettings,
} from "@/lib/email-settings"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  return NextResponse.json(await getEmailSettingsFromDb())
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const body    = await req.json()
    const current = await getEmailSettingsFromDb()

    const updated: EmailSettings = {
      on_login:    body.on_login    !== undefined ? Boolean(body.on_login)    : current.on_login,
      on_signup:   body.on_signup   !== undefined ? Boolean(body.on_signup)   : current.on_signup,
      on_purchase: body.on_purchase !== undefined ? Boolean(body.on_purchase) : current.on_purchase,
      templates: {
        login:    { subject: body.templates?.login?.subject    ?? current.templates.login.subject,    body: body.templates?.login?.body       ?? current.templates.login.body    },
        signup:   { subject: body.templates?.signup?.subject   ?? current.templates.signup.subject,   body: body.templates?.signup?.body      ?? current.templates.signup.body   },
        purchase: { subject: body.templates?.purchase?.subject ?? current.templates.purchase.subject, body: body.templates?.purchase?.body    ?? current.templates.purchase.body },
      },
    }

    const value = JSON.stringify(updated)
    const now   = new Date().toISOString()
    const KEY   = "email_settings"
    const rows  = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY))
    if (rows.length > 0) {
      await db.update(siteSettings).set({ value, updatedAt: now }).where(eq(siteSettings.key, KEY))
    } else {
      await db.insert(siteSettings).values({ key: KEY, value, updatedAt: now })
    }
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/admin/email/settings]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}
