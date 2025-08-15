"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAdminToast } from "@/components/admin-toast"
import { db, storage } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { z } from "zod"
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { timezones, dateFormats, currencies, languages } from "@/lib/constants"

interface SiteSettings {
  general: {
    siteName: string
    siteUrl: string
    adminEmail: string
    supportEmail: string
    logoUrl: string
  }
  regional: {
    timezone: string
    dateFormat: string
    currency: string
    language: string
  }
  jobListings: {
    autoApproveJobs: boolean
    jobExpiryDays: number
  }
  appearance: {
    primaryColor: string
    secondaryColor: string
  }
  notifications: {
    newUserNotification: boolean
    newJobNotification: boolean
    verificationNotification: boolean
    welcomeEmail: string
  }
}

const defaultSettings: SiteSettings = {
  general: {
    siteName: "RANAOJobs",
    siteUrl: "https://ranaojobs.com",
    adminEmail: "admin@ranaojobs.com",
    supportEmail: "support@ranaojobs.com",
    logoUrl: ""
  },
  regional: {
    timezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY",
    currency: "PHP (₱)",
    language: "English"
  },
  jobListings: {
    autoApproveJobs: false,
    jobExpiryDays: 30
  },
  appearance: {
    primaryColor: "#FFD700",
    secondaryColor: "#1F2937"
  },
  notifications: {
    newUserNotification: true,
    newJobNotification: true,
    verificationNotification: true,
    welcomeEmail: "Welcome to RANAOJobs! We're excited to have you join our platform. Get started by completing your profile and exploring job opportunities in Marawi City."
  }
}

// Validation schema
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1, "Site name is required"),
    siteUrl: z.string().url("Must be a valid URL"),
    adminEmail: z.string().email("Must be a valid email"),
    supportEmail: z.string().email("Must be a valid email"),
    logoUrl: z.string()
  }),
  regional: z.object({
    timezone: z.string(),
    dateFormat: z.string(),
    currency: z.string(),
    language: z.string()
  }),
  jobListings: z.object({
    autoApproveJobs: z.boolean(),
    jobExpiryDays: z.number().min(1).max(365)
  }),
  appearance: z.object({
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  }),
  notifications: z.object({
    newUserNotification: z.boolean(),
    newJobNotification: z.boolean(),
    verificationNotification: z.boolean(),
    welcomeEmail: z.string().min(1, "Welcome email template is required")
  })
})

export default function SettingsPage() {
  const { success, error } = useAdminToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "site-settings"))

        if (settingsDoc.exists()) {
          // Get data from Firestore
          const data = settingsDoc.data() as SiteSettings
          setSettings(data)
        } else {
          // If no settings exist, create default settings in Firestore
          await setDoc(doc(db, "settings", "site-settings"), defaultSettings)
        }
      } catch (err) {
        console.error("Error loading settings:", err)
        error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [error])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const storageRef = ref(storage, `logos/${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      updateSettings('general', 'logoUrl', url)
      success("Logo uploaded successfully")
    } catch (err) {
      console.error("Error uploading logo:", err)
      error("Failed to upload logo")
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Validate settings
      const validationResult = settingsSchema.safeParse(settings)
      if (!validationResult.success) {
        const errors: Record<string, string> = {}
        validationResult.error.issues.forEach(issue => {
          const path = issue.path.join('.')
          errors[path] = issue.message
        })
        setValidationErrors(errors)
        error("Please fix the validation errors")
        return
      }

      // Clear validation errors
      setValidationErrors({})

      // Update settings in Firestore
      await updateDoc(doc(db, "settings", "site-settings"), JSON.parse(JSON.stringify(settings)))
      success("Settings saved successfully")
    } catch (err) {
      console.error("Error saving settings:", err)
      error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (category: keyof SiteSettings, field: string, value: any) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [field]: value
      }
    })
    // Clear validation error when field is updated
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${category}.${field}`]
      return newErrors
    })
  }

  if (isLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </AdminLayout>
    )
  }

  const getError = (category: keyof SiteSettings, field: string) => {
    return validationErrors[`${category}.${field}`]
  }

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
            <CardDescription>Manage your platform configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Site Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site Name</Label>
                    <Input
                      id="site-name"
                      value={settings.general.siteName}
                      onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
                      className={getError('general', 'siteName') ? 'border-red-500' : ''}
                    />
                    {getError('general', 'siteName') && (
                      <p className="text-sm text-red-500">{getError('general', 'siteName')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site-url">Site URL</Label>
                    <Input
                      id="site-url"
                      value={settings.general.siteUrl}
                      onChange={(e) => updateSettings('general', 'siteUrl', e.target.value)}
                      className={getError('general', 'siteUrl') ? 'border-red-500' : ''}
                    />
                    {getError('general', 'siteUrl') && (
                      <p className="text-sm text-red-500">{getError('general', 'siteUrl')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      value={settings.general.adminEmail}
                      onChange={(e) => updateSettings('general', 'adminEmail', e.target.value)}
                      className={getError('general', 'adminEmail') ? 'border-red-500' : ''}
                    />
                    {getError('general', 'adminEmail') && (
                      <p className="text-sm text-red-500">{getError('general', 'adminEmail')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Support Email</Label>
                    <Input
                      id="support-email"
                      value={settings.general.supportEmail}
                      onChange={(e) => updateSettings('general', 'supportEmail', e.target.value)}
                      className={getError('general', 'supportEmail') ? 'border-red-500' : ''}
                    />
                    {getError('general', 'supportEmail') && (
                      <p className="text-sm text-red-500">{getError('general', 'supportEmail')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Regional Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.regional.timezone}
                      onValueChange={(value) => updateSettings('regional', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={settings.regional.dateFormat}
                      onValueChange={(value) => updateSettings('regional', 'dateFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormats.map((format) => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={settings.regional.currency}
                      onValueChange={(value) => updateSettings('regional', 'currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={settings.regional.language}
                      onValueChange={(value) => updateSettings('regional', 'language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>


            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-black rounded-full"></span>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  )
}
