import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { appReleases } from "@/lib/db/schema"
import {
  appDownloadUrl, ensureAppReleasesTable, getAppReleasePath,
  getAppReleasesDir, isAppPlatform, isZipPackage,
} from "@/lib/app-releases"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

function serialize(row: any) {
  return {
    platform: row.platform,
    originalName: row.originalName,
    version: row.version,
    fileSize: Number(row.fileSize),
    uploadedAt: row.uploadedAt,
    downloadUrl: appDownloadUrl(row.platform),
    fileExists: fs.existsSync(getAppReleasePath(row.filename)),
  }
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  await ensureAppReleasesTable()
  const rows = await db.select().from(appReleases)
  return NextResponse.json(rows.map(serialize), { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  let newFilePath = ""
  try {
    await ensureAppReleasesTable()
    const form = await req.formData()
    const platform = form.get("platform")
    const version = String(form.get("version") ?? "").trim().slice(0, 100)
    const file = form.get("file")

    if (!isAppPlatform(platform) || !(file instanceof File)) {
      return NextResponse.json({ error: "Platform and app file are required." }, { status: 400 })
    }

    const expectedExtension = platform === "android" ? ".apk" : ".ipa"
    if (path.extname(file.name).toLowerCase() !== expectedExtension) {
      return NextResponse.json({ error: `Upload a valid ${expectedExtension} file for ${platform}.` }, { status: 415 })
    }

    const maxSizeMb = Math.max(1, Number(process.env.MAX_APP_UPLOAD_MB ?? 300))
    if (file.size <= 0 || file.size > maxSizeMb * 1024 * 1024) {
      return NextResponse.json({ error: `App file must be smaller than ${maxSizeMb} MB.` }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!isZipPackage(buffer)) {
      return NextResponse.json({ error: "The uploaded file is not a valid APK/IPA package." }, { status: 415 })
    }

    const previousRows = await db.select().from(appReleases).where(eq(appReleases.platform, platform))
    const previous = previousRows[0]
    const filename = `${platform}-${Date.now()}${expectedExtension}`
    newFilePath = getAppReleasePath(filename)
    const tempPath = path.join(getAppReleasesDir(), `.${filename}.uploading`)
    await fs.promises.writeFile(tempPath, buffer, { flag: "wx" })
    await fs.promises.rename(tempPath, newFilePath)

    const release = {
      platform,
      filename,
      originalName: path.basename(file.name).slice(0, 512),
      version,
      mimeType: platform === "android" ? "application/vnd.android.package-archive" : "application/octet-stream",
      fileSize: file.size,
      uploadedBy: admin.id,
      uploadedAt: new Date().toISOString(),
    }
    await db.insert(appReleases).values(release).onDuplicateKeyUpdate({ set: release })

    if (previous?.filename && previous.filename !== filename) {
      await fs.promises.unlink(getAppReleasePath(previous.filename)).catch(() => {})
    }
    return NextResponse.json(serialize(release), { status: 201 })
  } catch (error) {
    if (newFilePath) await fs.promises.unlink(newFilePath).catch(() => {})
    console.error("[POST /api/admin/apps]", error)
    return NextResponse.json({ error: "App upload failed." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  await ensureAppReleasesTable()
  const platform = req.nextUrl.searchParams.get("platform")
  if (!isAppPlatform(platform)) return NextResponse.json({ error: "Invalid platform." }, { status: 400 })

  const rows = await db.select().from(appReleases).where(eq(appReleases.platform, platform))
  const release = rows[0]
  await db.delete(appReleases).where(eq(appReleases.platform, platform))
  if (release?.filename) await fs.promises.unlink(getAppReleasePath(release.filename)).catch(() => {})
  return NextResponse.json({ ok: true })
}
