"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileUp, RefreshCw, Smartphone, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AdminShell } from "@/components/admin-shell"
import { adminApi, type AdminAppRelease, type AppPlatform } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

const PLATFORMS: { platform: AppPlatform; title: string; extension: string; description: string }[] = [
  {
    platform: "android",
    title: "Android app",
    extension: ".apk",
    description: "Upload a signed APK. Visitors on Android will receive this download.",
  },
  {
    platform: "ios",
    title: "iOS app",
    extension: ".ipa",
    description: "Upload a signed IPA. Installation still requires valid Apple provisioning for the user’s device.",
  },
]

function formatBytes(value: number) {
  if (!value) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export default function AdminAppsPage() {
  const [releases, setReleases] = useState<AdminAppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<AppPlatform | null>(null)
  const [progress, setProgress] = useState(0)
  const [versions, setVersions] = useState<Record<AppPlatform, string>>({ android: "", ios: "" })
  const files = useRef<Record<AppPlatform, HTMLInputElement | null>>({ android: null, ios: null })

  async function load() {
    try { setReleases(await adminApi.listApps()) }
    catch (error) { toast.error(error instanceof Error ? error.message : "Failed to load app releases.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function upload(platform: AppPlatform) {
    const input = files.current[platform]
    const file = input?.files?.[0]
    if (!file) {
      toast.error(`Select an ${platform === "android" ? "APK" : "IPA"} file first.`)
      return
    }
    setBusy(platform)
    setProgress(0)
    try {
      const uploaded = await adminApi.uploadApp(platform, file, versions[platform], setProgress)
      setReleases((current) => [uploaded, ...current.filter((row) => row.platform !== platform)])
      if (input) input.value = ""
      toast.success(`${platform === "android" ? "Android" : "iOS"} app published.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setBusy(null)
      setProgress(0)
    }
  }

  async function remove(platform: AppPlatform) {
    if (!window.confirm(`Remove the ${platform === "android" ? "Android" : "iOS"} app download?`)) return
    setBusy(platform)
    try {
      await adminApi.deleteApp(platform)
      setReleases((current) => current.filter((row) => row.platform !== platform))
      toast.success("App download removed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the app.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell>
      <div className="flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mobile apps</h1>
          <p className="text-muted-foreground">Publish and replace Android and iOS downloads stored on this server.</p>
        </div>

        {loading ? <div className="flex justify-center py-20"><Spinner className="size-8" /></div> : (
          <div className="grid gap-5 lg:grid-cols-2">
            {PLATFORMS.map(({ platform, title, extension, description }) => {
              const release = releases.find((row) => row.platform === platform)
              const uploading = busy === platform
              return (
                <Card key={platform}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Smartphone className="size-5" />{title}</CardTitle>
                        <CardDescription className="mt-1">{description}</CardDescription>
                      </div>
                      <Badge variant={release?.fileExists ? "default" : "secondary"}>
                        {release?.fileExists ? "Available" : "Not published"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    {release && (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="truncate font-medium" title={release.originalName}>{release.originalName}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {release.version && <span>Version {release.version}</span>}
                          <span>{formatBytes(release.fileSize)}</span>
                          <span>{new Date(release.uploadedAt).toLocaleString("en-IN")}</span>
                        </div>
                        {!release.fileExists && <p className="mt-2 text-xs text-destructive">The database entry exists, but the file is missing from storage.</p>}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor={`${platform}-version`}>Version <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input
                        id={`${platform}-version`}
                        placeholder="e.g. 1.0.0"
                        maxLength={100}
                        value={versions[platform]}
                        onChange={(event) => setVersions((current) => ({ ...current, [platform]: event.target.value }))}
                        disabled={uploading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${platform}-file`}>{extension.toUpperCase()} file</Label>
                      <Input
                        id={`${platform}-file`}
                        type="file"
                        accept={extension}
                        ref={(element) => { files.current[platform] = element }}
                        disabled={uploading}
                      />
                    </div>

                    {uploading && progress > 0 && (
                      <div className="grid gap-1.5">
                        <Progress value={progress} />
                        <p className="text-right text-xs text-muted-foreground">{progress}% uploaded</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => upload(platform)} disabled={Boolean(busy)}>
                        {uploading ? <Spinner data-icon="inline-start" /> : release ? <RefreshCw data-icon="inline-start" /> : <FileUp data-icon="inline-start" />}
                        {release ? "Replace app" : "Publish app"}
                      </Button>
                      {release?.fileExists && (
                        <Button variant="outline" nativeButton={false} render={<a href={release.downloadUrl} />}>
                          <Download data-icon="inline-start" />Download
                        </Button>
                      )}
                      {release && (
                        <Button variant="destructive" onClick={() => remove(platform)} disabled={Boolean(busy)}>
                          <Trash2 data-icon="inline-start" />Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
