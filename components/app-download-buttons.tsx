"use client"

import { useEffect, useState } from "react"
import { Download, Smartphone } from "lucide-react"
import { appsApi, type AppPlatform, type AppRelease } from "@/lib/api"
import { Button } from "@/components/ui/button"

function currentPlatform(): AppPlatform | null {
  const agent = navigator.userAgent
  if (/Android/i.test(agent)) return "android"
  if (/iPad|iPhone|iPod/i.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios"
  return null
}

export function AppDownloadButtons() {
  const [releases, setReleases] = useState<AppRelease[]>([])
  const [platform, setPlatform] = useState<AppPlatform | null>(null)

  useEffect(() => {
    setPlatform(currentPlatform())
    appsApi.list().then(setReleases).catch(() => {})
  }, [])

  const visible = platform ? releases.filter((release) => release.platform === platform) : releases
  if (visible.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {visible.map((release) => (
        <Button
          key={release.platform}
          variant="secondary"
          size="lg"
          nativeButton={false}
          render={<a href={release.downloadUrl} />}
        >
          {release.platform === "android" ? <Download data-icon="inline-start" /> : <Smartphone data-icon="inline-start" />}
          Download for {release.platform === "android" ? "Android" : "iOS"}
          {release.version ? ` v${release.version}` : ""}
        </Button>
      ))}
    </div>
  )
}
