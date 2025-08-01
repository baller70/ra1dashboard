// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation

import { useState, useEffect } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { Switch } from '../../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'
import { Badge } from '../../components/ui/badge'
import { 
  Save,
  Settings as SettingsIcon,
  CreditCard,
  Mail,
  Smartphone,
  Bell,
  Shield,
  Database,
  User,
  Palette,
  Monitor,
  Moon,
  Sun,
  Globe,
  Key,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import { Toaster } from '../../components/ui/toaster'

interface SystemSettings {
  programName: string
  programFee: string
  emailFromAddress: string
  smsFromNumber: string
  reminderDays: string
  lateFeeAmount: string
  gracePeriodDays: string
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  currency: string
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    paymentReminders: boolean
    overdueAlerts: boolean
    systemUpdates: boolean
    marketingEmails: boolean
  }
  dashboard: {
    defaultView: string
    showWelcomeMessage: boolean
    compactMode: boolean
    autoRefresh: boolean
    refreshInterval: number
  }
  privacy: {
    shareUsageData: boolean
    allowAnalytics: boolean
    twoFactorAuth: boolean
  }
}

interface UserProfile {
  name: string
  email: string
  role: string
  phone: string
  organization: string
  avatar: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SystemSettings>({
    programName: '',
    programFee: '',
    emailFromAddress: '',
    smsFromNumber: '',
    reminderDays: '',
    lateFeeAmount: '',
    gracePeriodDays: ''
  })
  
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    notifications: {
      email: true,
      sms: true,
      push: true,
      paymentReminders: true,
      overdueAlerts: true,
      systemUpdates: true,
      marketingEmails: false,
    },
    dashboard: {
      defaultView: 'overview',
      showWelcomeMessage: true,
      compactMode: false,
      autoRefresh: true,
      refreshInterval: 30,
    },
    privacy: {
      shareUsageData: false,
      allowAnalytics: true,
      twoFactorAuth: false,
    }
  })

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: '',
    phone: '',
    organization: '',
    avatar: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Load settings from Convex database
        const response = await fetch('/api/settings', {
          headers: {
            'x-api-key': 'ra1-dashboard-api-key-2024', // API key for Vercel auth bypass
          },
        })
        if (response.ok) {
          const data = await response.json()
          console.log('🌐 Settings fetched from server:', data);
          
          // Set system settings from array format
          if (data.systemSettings && Array.isArray(data.systemSettings)) {
            const systemSettingsObj: SystemSettings = {
              programName: data.systemSettings.find((s: any) => s.key === 'program_name')?.value || '',
              programFee: data.systemSettings.find((s: any) => s.key === 'program_fee')?.value || '',
              emailFromAddress: data.systemSettings.find((s: any) => s.key === 'email_from_address')?.value || '',
              smsFromNumber: data.systemSettings.find((s: any) => s.key === 'sms_from_number')?.value || '',
              reminderDays: data.systemSettings.find((s: any) => s.key === 'reminder_days')?.value || '',
              lateFeeAmount: data.systemSettings.find((s: any) => s.key === 'late_fee_amount')?.value || '',
              gracePeriodDays: data.systemSettings.find((s: any) => s.key === 'grace_period_days')?.value || ''
            }
            setSettings(systemSettingsObj)
          }
          
          // Set user preferences with proper mapping
          if (data.userPreferences) {
            setUserPreferences(prev => ({
              ...prev,
              theme: data.userPreferences.theme || 'system',
              language: data.userPreferences.language || 'en',
              timezone: data.userPreferences.timezone || 'America/New_York',
              dateFormat: data.userPreferences.dateFormat || 'MM/dd/yyyy',
              currency: data.userPreferences.currency || 'USD',
              notifications: {
                email: data.userPreferences.emailNotifications !== false,
                sms: data.userPreferences.smsNotifications !== false,
                push: data.userPreferences.pushNotifications !== false,
                paymentReminders: data.userPreferences.paymentReminders !== false,
                overdueAlerts: data.userPreferences.overdueAlerts !== false,
                systemUpdates: data.userPreferences.systemUpdates !== false,
                marketingEmails: data.userPreferences.marketingEmails || false,
              },
              dashboard: {
                defaultView: data.userPreferences.defaultView || 'overview',
                showWelcomeMessage: data.userPreferences.showWelcomeMessage !== false,
                compactMode: data.userPreferences.compactMode || false,
                autoRefresh: data.userPreferences.autoRefresh !== false,
                refreshInterval: data.userPreferences.refreshInterval || 30,
              },
              privacy: {
                shareUsageData: data.userPreferences.shareUsageData || false,
                allowAnalytics: data.userPreferences.allowAnalytics !== false,
                twoFactorAuth: data.userPreferences.twoFactorAuth || false,
              }
            }))
          }
          
          // Set user profile
          if (data.user) {
            setUserProfile({
              name: data.user.name || '',
              email: data.user.email || '',
              role: data.user.role || '',
              phone: data.user.phone || '',
              organization: data.user.organization || 'Rise as One Basketball',
              avatar: data.user.avatar || ''
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        toast({
          title: "Error",
          description: "Failed to load settings. Please refresh the page.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert system settings to API format
      const systemSettingsArray = [
        { key: 'program_name', value: settings.programName },
        { key: 'program_fee', value: settings.programFee },
        { key: 'email_from_address', value: settings.emailFromAddress },
        { key: 'sms_from_number', value: settings.smsFromNumber },
        { key: 'reminder_days', value: settings.reminderDays },
        { key: 'late_fee_amount', value: settings.lateFeeAmount },
        { key: 'grace_period_days', value: settings.gracePeriodDays }
      ]

      // Convert user preferences to API format
      const userPreferencesForAPI = {
        theme: userPreferences.theme,
        language: userPreferences.language,
        timezone: userPreferences.timezone,
        dateFormat: userPreferences.dateFormat,
        currency: userPreferences.currency,
        emailNotifications: userPreferences.notifications.email,
        smsNotifications: userPreferences.notifications.sms,
        pushNotifications: userPreferences.notifications.push,
        paymentReminders: userPreferences.notifications.paymentReminders,
        overdueAlerts: userPreferences.notifications.overdueAlerts,
        systemUpdates: userPreferences.notifications.systemUpdates,
        marketingEmails: userPreferences.notifications.marketingEmails,
        defaultView: userPreferences.dashboard.defaultView,
        showWelcomeMessage: userPreferences.dashboard.showWelcomeMessage,
        compactMode: userPreferences.dashboard.compactMode,
        autoRefresh: userPreferences.dashboard.autoRefresh,
        refreshInterval: userPreferences.dashboard.refreshInterval,
        shareUsageData: userPreferences.privacy.shareUsageData,
        allowAnalytics: userPreferences.privacy.allowAnalytics,
        twoFactorAuth: userPreferences.privacy.twoFactorAuth,
      }

      // Save to Convex database
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024', // API key for Vercel auth bypass
        },
        body: JSON.stringify({
          systemSettings: systemSettingsArray,
          userPreferences: userPreferencesForAPI,
          userProfile
        }),
      })

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Settings saved to Convex successfully:', result);
        toast({
          title: "Settings saved",
          description: "Your settings have been updated successfully.",
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Settings save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save settings')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      const response = await fetch('/api/settings/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rise-as-one-settings-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "Export successful",
          description: "Your settings have been exported successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExportingData(false)
    }
  }

  const handleResetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/settings/reset', { method: 'POST' })
        if (response.ok) {
          window.location.reload()
        }
      } catch (error) {
        toast({
          title: "Reset failed",
          description: "Failed to reset settings. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Configure your basketball program management system and personal preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportData} variant="outline" disabled={exportingData}>
              {exportingData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Program Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Program Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="programName">Program Name</Label>
                    <Input
                      id="programName"
                      value={settings.programName}
                      onChange={(e) => setSettings(prev => ({ ...prev, programName: e.target.value }))}
                      placeholder="Rise as One Yearly Program"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="programFee">Annual Program Fee ($)</Label>
                    <Input
                      id="programFee"
                      type="number"
                      value={settings.programFee}
                      onChange={(e) => setSettings(prev => ({ ...prev, programFee: e.target.value }))}
                      placeholder="1565"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeeAmount">Late Fee Amount ($)</Label>
                    <Input
                      id="lateFeeAmount"
                      type="number"
                      value={settings.lateFeeAmount}
                      onChange={(e) => setSettings(prev => ({ ...prev, lateFeeAmount: e.target.value }))}
                      placeholder="25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                    <Input
                      id="gracePeriodDays"
                      type="number"
                      value={settings.gracePeriodDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, gracePeriodDays: e.target.value }))}
                      placeholder="3"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Communication Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Communication Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailFromAddress">From Email Address</Label>
                    <Input
                      id="emailFromAddress"
                      type="email"
                      value={settings.emailFromAddress}
                      onChange={(e) => setSettings(prev => ({ ...prev, emailFromAddress: e.target.value }))}
                      placeholder="admin@riseasone.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smsFromNumber">SMS From Number</Label>
                    <Input
                      id="smsFromNumber"
                      value={settings.smsFromNumber}
                      onChange={(e) => setSettings(prev => ({ ...prev, smsFromNumber: e.target.value }))}
                      placeholder="+1-555-0123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminderDays">Payment Reminder Days</Label>
                    <Input
                      id="reminderDays"
                      value={settings.reminderDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, reminderDays: e.target.value }))}
                      placeholder="7,1"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated list of days before due date to send reminders
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={userProfile.phone}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={userProfile.role} onValueChange={(value) => setUserProfile(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={userProfile.organization}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="Rise as One Basketball"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={userPreferences.language} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={userPreferences.timezone} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, timezone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={userPreferences.dateFormat} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, dateFormat: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={userPreferences.currency} onValueChange={(value) => setUserPreferences(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      checked={userPreferences.notifications.email}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive urgent notifications via SMS
                      </p>
                    </div>
                    <Switch 
                      checked={userPreferences.notifications.sms}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, sms: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive browser push notifications
                      </p>
                    </div>
                    <Switch 
                      checked={userPreferences.notifications.push}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, push: checked }
                      }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Specific Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Payment Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications for upcoming payment due dates
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.notifications.paymentReminders}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, paymentReminders: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Overdue Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          High-priority alerts for overdue payments
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.notifications.overdueAlerts}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, overdueAlerts: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>System Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about system maintenance and updates
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.notifications.systemUpdates}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, systemUpdates: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">
                          Promotional emails and program updates
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.notifications.marketingEmails}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, marketingEmails: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={userPreferences.theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUserPreferences(prev => ({ ...prev, theme: 'light' }))}
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </Button>
                      <Button
                        variant={userPreferences.theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUserPreferences(prev => ({ ...prev, theme: 'dark' }))}
                      >
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </Button>
                      <Button
                        variant={userPreferences.theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUserPreferences(prev => ({ ...prev, theme: 'system' }))}
                      >
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Dashboard Settings</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultView">Default Dashboard View</Label>
                      <Select 
                        value={userPreferences.dashboard.defaultView} 
                        onValueChange={(value) => setUserPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, defaultView: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overview">Overview</SelectItem>
                          <SelectItem value="payments">Payments</SelectItem>
                          <SelectItem value="parents">Parents</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Welcome Message</Label>
                        <p className="text-sm text-muted-foreground">
                          Display welcome message on dashboard
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.dashboard.showWelcomeMessage}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, showWelcomeMessage: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Use compact layout for more information density
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.dashboard.compactMode}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, compactMode: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Refresh</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically refresh dashboard data
                        </p>
                      </div>
                      <Switch 
                        checked={userPreferences.dashboard.autoRefresh}
                        onCheckedChange={(checked) => setUserPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, autoRefresh: checked }
                        }))}
                      />
                    </div>
                    {userPreferences.dashboard.autoRefresh && (
                      <div className="space-y-2">
                        <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                        <Select 
                          value={userPreferences.dashboard.refreshInterval.toString()} 
                          onValueChange={(value) => setUserPreferences(prev => ({
                            ...prev,
                            dashboard: { ...prev.dashboard, refreshInterval: parseInt(value) }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                            <SelectItem value="300">5 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Share Usage Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve the app by sharing anonymous usage data
                      </p>
                    </div>
                    <Switch 
                      checked={userPreferences.privacy.shareUsageData}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, shareUsageData: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Analytics</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable analytics to help us understand app usage
                      </p>
                    </div>
                    <Switch 
                      checked={userPreferences.privacy.allowAnalytics}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, allowAnalytics: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={userPreferences.privacy.twoFactorAuth ? 'default' : 'secondary'}>
                        {userPreferences.privacy.twoFactorAuth ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setUserPreferences(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, twoFactorAuth: !prev.privacy.twoFactorAuth }
                        }))}
                      >
                        {userPreferences.privacy.twoFactorAuth ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Management</h4>
                  <div className="space-y-3">
                    <Button variant="outline" onClick={handleExportData} disabled={exportingData}>
                      <Download className="mr-2 h-4 w-4" />
                      Export My Data
                    </Button>
                    <Button variant="outline" disabled>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Settings
                    </Button>
                    <Button variant="destructive" onClick={handleResetSettings}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Integration */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Integration
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="stripePublishableKey">Stripe Publishable Key</Label>
                      <Input
                        id="stripePublishableKey"
                        type="password"
                        placeholder="pk_test_..."
                        disabled
                      />
                      <p className="text-sm text-muted-foreground">
                        Contact support to configure Stripe integration
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                      <Input
                        id="stripeSecretKey"
                        type="password"
                        placeholder="sk_test_..."
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                      <Input
                        id="stripeWebhookSecret"
                        type="password"
                        placeholder="whsec_..."
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* API Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Configuration
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                      <Input
                        id="openaiApiKey"
                        type="password"
                        placeholder="sk-..."
                        disabled
                      />
                      <p className="text-sm text-muted-foreground">
                        Required for AI-powered features
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resendApiKey">Resend API Key</Label>
                      <Input
                        id="resendApiKey"
                        type="password"
                        placeholder="re_..."
                        disabled
                      />
                      <p className="text-sm text-muted-foreground">
                        Required for email notifications
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* System Information */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    System Information
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Application Version:</span>
                      <Badge variant="outline">v2.1.0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database:</span>
                      <Badge variant="outline">Convex</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment:</span>
                      <Badge variant="outline">Development</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
      <Toaster />
    </AppLayout>
  )
}
