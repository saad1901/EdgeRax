"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Save, Phone, Mail, MapPin, Monitor } from "lucide-react"
import { AdminShell } from "@/components/admin-shell"
import { siteSettingsApi, type SiteSettings } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({ phones: [], emails: [], addresses: [] })
  const [maxDevices, setMaxDevices] = useState("0")
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    siteSettingsApi.get()
      .then((data) => {
        setSettings(data)
        setMaxDevices(String((data as any).max_devices ?? 0))
      })
      .catch(() => toast.error("Failed to load settings."))
      .finally(() => setLoading(false))
  }, [])

  function updateItem(key: keyof SiteSettings, index: number, value: string) {
    setSettings((prev) => {
      const arr = [...prev[key]]
      arr[index] = value
      return { ...prev, [key]: arr }
    })
  }

  function addItem(key: keyof SiteSettings) {
    setSettings((prev) => ({ ...prev, [key]: [...prev[key], ""] }))
  }

  function removeItem(key: keyof SiteSettings, index: number) {
    setSettings((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  async function handleSave() {
    const deviceLimit = Math.max(0, Number(maxDevices) || 0)
    setSaving(true)
    try {
      const updated = await siteSettingsApi.update({
        ...settings,
        max_devices: deviceLimit,
      } as any)
      setSettings(updated)
      setMaxDevices(String((updated as any).max_devices ?? 0))
      toast.success("Settings saved.")
    } catch {
      toast.error("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  const sections: { key: keyof SiteSettings; label: string; icon: React.ElementType; placeholder: string; type?: string }[] = [
    { key: "phones",    label: "Phone Numbers",    icon: Phone,   placeholder: "+91 98765 43210", type: "tel" },
    { key: "emails",    label: "Email Addresses",  icon: Mail,    placeholder: "support@edgerax.com", type: "email" },
    { key: "addresses", label: "Office Addresses", icon: MapPin,  placeholder: "123 Main Street, City, State - 400001" },
  ]

  return (
    <AdminShell>
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Settings</h1>
          <p className="text-muted-foreground">
            Manage contact information and platform security settings.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <>
            {/* Device limit card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="size-4" /> Device Login Limit
                </CardTitle>
                <CardDescription>
                  Maximum number of devices a student account can be logged into simultaneously.
                  Set to <strong>0</strong> for unlimited. Admins and instructors are always exempt.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3 max-w-xs">
                  <Input
                    type="number"
                    min={0}
                    value={maxDevices}
                    onChange={(e) => setMaxDevices(e.target.value)}
                    placeholder="0 = unlimited"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {Number(maxDevices) === 0 ? "Unlimited" : `Max ${maxDevices} device${Number(maxDevices) === 1 ? "" : "s"}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  When a student tries to log in and already has the maximum number of active sessions, they'll see an error asking them to log out of another device first.
                </p>
              </CardContent>
            </Card>

            {sections.map(({ key, label, icon: Icon, placeholder, type }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4" />{label}
                  </CardTitle>
                  <CardDescription>
                    All {label.toLowerCase()} will be shown in the site footer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {settings[key].length === 0 && (
                    <p className="text-sm text-muted-foreground">No {label.toLowerCase()} added yet.</p>
                  )}
                  {settings[key].map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type={type ?? "text"}
                        value={val}
                        onChange={(e) => updateItem(key, idx, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        onClick={() => removeItem(key, idx)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit gap-1.5"
                    onClick={() => addItem(key)}
                  >
                    <Plus className="size-4" />Add {label.slice(0, -1).toLowerCase()}
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-fit">
              {saving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              Save all settings
            </Button>
          </>
        )}
      </div>
    </AdminShell>
  )
}
