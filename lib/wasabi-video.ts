import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import fs from "fs"
import path from "path"

const VIDEO_PREFIX = "videos/"
const LOCAL_VIDEO_DIR = path.join(process.cwd(), "storage", "videos")

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for Wasabi video storage.`)
  return value
}

function getWasabiConfig() {
  const region = process.env.WASABI_REGION || "us-east-1"
  const endpoint = process.env.WASABI_ENDPOINT || `https://s3.${region}.wasabisys.com`

  return {
    region,
    endpoint,
    bucket: process.env.WASABI_BUCKET || "",
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || "",
  }
}

export function createWasabiClient() {
  const config = getWasabiConfig()
  if (!config.bucket) requireEnv("WASABI_BUCKET")
  if (!config.accessKeyId) requireEnv("WASABI_ACCESS_KEY_ID")
  if (!config.secretAccessKey) requireEnv("WASABI_SECRET_ACCESS_KEY")

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // In local dev the system may not trust Wasabi's cert chain.
    // Never disable verification in production.
    requestHandler: process.env.NODE_ENV !== "production"
      ? new (require("@smithy/node-http-handler").NodeHttpHandler)({
          httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
        })
      : undefined,
  })
}

export function getWasabiBucket() {
  const bucket = getWasabiConfig().bucket
  if (!bucket) requireEnv("WASABI_BUCKET")
  return bucket
}

export function getGcoreCdnBaseUrl() {
  const gcore = process.env.GCORE_CDN_URL || ""
  return gcore.replace(/\/$/, "")
}

export function buildGcoreCdnUrl(path: string) {
  const cleanPath = String(path || "").replace(/^\/+/, "")
  const base = getGcoreCdnBaseUrl()
  if (!base || !cleanPath) return cleanPath
  return `${base}/${cleanPath}`
}

export function getVideoKeyFromMarker(videoUrl: string | null | undefined, lessonId?: string) {
  if (videoUrl?.startsWith("wasabi:")) return videoUrl.slice("wasabi:".length)
  if (videoUrl?.startsWith("local:")) return path.join(LOCAL_VIDEO_DIR, String(videoUrl.slice("local:".length)))
  return lessonId ? `${VIDEO_PREFIX}${lessonId}.mp4` : ""
}

export function isPrivateVideoMarker(videoUrl: string | null | undefined) {
  return Boolean(videoUrl?.startsWith("wasabi:") || videoUrl?.startsWith("local:"))
}

export function isLocalVideoMarker(videoUrl: string | null | undefined) {
  return Boolean(videoUrl?.startsWith("local:"))
}

export function getVideoMarker(key: string) {
  return `wasabi:${key}`
}

export function getLocalVideoMarker(filename: string) {
  return `local:${filename}`
}

export function getLocalVideoPath(filename: string) {
  return path.join(LOCAL_VIDEO_DIR, filename)
}

export async function deleteLocalVideo(videoUrl: string | null | undefined) {
  if (!videoUrl?.startsWith("local:")) return
  const filename = videoUrl.slice("local:".length)
  const fp = getLocalVideoPath(filename)
  if (fs.existsSync(fp)) fs.unlinkSync(fp)
}

export function extensionFromMime(contentType: string) {
  switch (contentType) {
    case "video/webm":
      return "webm"
    case "video/ogg":
      return "ogv"
    case "video/quicktime":
      return "mov"
    default:
      return "mp4"
  }
}

export async function uploadVideoToWasabi(params: {
  lessonId: string
  body: Buffer
  contentType: string
  contentLength?: number
}) {
  const key = `${VIDEO_PREFIX}${params.lessonId}.${extensionFromMime(params.contentType)}`
  const client = createWasabiClient()

  await client.send(new PutObjectCommand({
    Bucket: getWasabiBucket(),
    Key: key,
    Body: params.body,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  }))

  return key
}

export async function headWasabiVideo(key: string) {
  const client = createWasabiClient()
  return client.send(new HeadObjectCommand({
    Bucket: getWasabiBucket(),
    Key: key,
  }))
}

export async function getWasabiVideo(key: string, range?: string | null) {
  const client = createWasabiClient()
  return client.send(new GetObjectCommand({
    Bucket: getWasabiBucket(),
    Key: key,
    Range: range || undefined,
  }))
}

export async function deleteWasabiVideo(key: string) {
  if (!key) return
  const client = createWasabiClient()
  await client.send(new DeleteObjectCommand({
    Bucket: getWasabiBucket(),
    Key: key,
  }))
}

/**
 * Generates a plain Gcore CDN URL for a given object key.
 *
 * Returns null if GCORE_CDN_URL is not configured
 * (falls back to proxy streaming in the video route).
 */
export function generateGcoreCdnUrl(objectKey: string): string | null {
  const cdnBase = getGcoreCdnBaseUrl()
  if (!cdnBase) return null

  const urlPath = `/${objectKey.replace(/^\/+/, "")}`
  return `${cdnBase}${urlPath}`
}
