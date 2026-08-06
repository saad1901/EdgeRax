import fs from "fs"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { appReleases } from "@/lib/db/schema"
import { appDownloadUrl, ensureAppReleasesTable, getAppReleasePath, type AppPlatform } from "@/lib/app-releases"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await ensureAppReleasesTable()
    const rows = await db.select().from(appReleases)
    const releases = rows
      .filter((row: any) => fs.existsSync(getAppReleasePath(row.filename)))
      .map((row: any) => ({
        platform: row.platform as AppPlatform,
        version: row.version,
        fileSize: Number(row.fileSize),
        uploadedAt: row.uploadedAt,
        downloadUrl: appDownloadUrl(row.platform),
      }))
    return NextResponse.json(releases, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[GET /api/apps]", error)
    return NextResponse.json({ error: "Unable to load app downloads." }, { status: 500 })
  }
}
