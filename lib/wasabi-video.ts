import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

const VIDEO_PREFIX = "videos/"

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

export function getVideoKeyFromMarker(videoUrl: string | null | undefined, lessonId?: string) {
  if (videoUrl?.startsWith("wasabi:")) return videoUrl.slice("wasabi:".length)
  if (videoUrl?.startsWith("local:")) return `${VIDEO_PREFIX}${videoUrl.slice("local:".length)}.mp4`
  return lessonId ? `${VIDEO_PREFIX}${lessonId}.mp4` : ""
}

export function isPrivateVideoMarker(videoUrl: string | null | undefined) {
  return Boolean(videoUrl?.startsWith("wasabi:") || videoUrl?.startsWith("local:"))
}

export function getVideoMarker(key: string) {
  return `wasabi:${key}`
}

/**
 * Returns the Bunny CDN URL for a Wasabi object key if BUNNY_CDN_URL is set,
 * otherwise falls back to the internal proxy route /api/video/[lessonId].
 */
export function getCdnVideoUrl(key: string): string {
  const cdn = process.env.BUNNY_CDN_URL?.replace(/\/$/, "")
  if (cdn) return `${cdn}/${key}`
  return "" // caller falls back to proxy
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
