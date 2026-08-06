import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { appReleases } from "@/lib/db/schema"
import { ensureAppReleasesTable, getAppReleasePath, isAppPlatform } from "@/lib/app-releases"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  await ensureAppReleasesTable()
  const { platform } = await params
  if (!isAppPlatform(platform)) return new NextResponse("Not found.", { status: 404 })

  const rows = await db.select().from(appReleases).where(eq(appReleases.platform, platform))
  const release = rows[0]
  if (!release) return new NextResponse("This app is not currently available.", { status: 404 })

  const filePath = getAppReleasePath(release.filename)
  if (!fs.existsSync(filePath)) return new NextResponse("App file is missing.", { status: 404 })

  const stat = await fs.promises.stat(filePath)
  const range = req.headers.get("range")
  const fallbackName = `edgerax-${platform}${path.extname(release.filename)}`
  const headers: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": release.mimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(release.originalName)}`,
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  }

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } })
    const suffixLength = !match[1] && match[2] ? Number(match[2]) : null
    const start = suffixLength != null ? Math.max(0, stat.size - suffixLength) : Number(match[1])
    const end = suffixLength != null ? stat.size - 1 : match[2] ? Number(match[2]) : stat.size - 1
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= stat.size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } })
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`
    headers["Content-Length"] = String(end - start + 1)
    return new NextResponse(fs.createReadStream(filePath, { start, end }) as unknown as ReadableStream, { status: 206, headers })
  }

  headers["Content-Length"] = String(stat.size)
  return new NextResponse(fs.createReadStream(filePath) as unknown as ReadableStream, { headers })
}
