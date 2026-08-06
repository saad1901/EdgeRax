import fs from "fs"
import path from "path"
import { client } from "@/lib/db"

export type AppPlatform = "android" | "ios"

let tableReady: Promise<void> | null = null

export function isAppPlatform(value: unknown): value is AppPlatform {
  return value === "android" || value === "ios"
}

export function getAppReleasesDir() {
  return process.env.STORAGE_PATH
    ? path.join(path.resolve(process.env.STORAGE_PATH), "apps")
    : path.join(process.cwd(), "storage", "apps")
}

export function getAppReleasePath(filename: string) {
  return path.join(getAppReleasesDir(), path.basename(filename))
}

export async function ensureAppReleasesTable() {
  if (!tableReady) {
    tableReady = client.execRaw(`CREATE TABLE IF NOT EXISTS app_releases (
      platform VARCHAR(20) PRIMARY KEY,
      filename VARCHAR(512) NOT NULL,
      original_name VARCHAR(512) NOT NULL,
      version VARCHAR(100) NOT NULL DEFAULT '',
      mime_type VARCHAR(191) NOT NULL DEFAULT 'application/octet-stream',
      file_size DOUBLE NOT NULL DEFAULT 0,
      uploaded_by VARCHAR(191),
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT app_releases_uploaded_by_users_id_fk
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    )`).catch((error) => {
      tableReady = null
      throw error
    })
  }
  await tableReady
  await fs.promises.mkdir(getAppReleasesDir(), { recursive: true })
}

export function isZipPackage(buffer: Buffer) {
  if (buffer.length < 4) return false
  return buffer[0] === 0x50 && buffer[1] === 0x4b && (
    (buffer[2] === 0x03 && buffer[3] === 0x04)
    || (buffer[2] === 0x05 && buffer[3] === 0x06)
    || (buffer[2] === 0x07 && buffer[3] === 0x08)
  )
}

export function appDownloadUrl(platform: AppPlatform) {
  return `/api/apps/${platform}/download`
}
