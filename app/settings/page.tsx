// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Switch } from '../../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { 
  Save,
  Settings as SettingsIcon,
  CreditCard,
  Mail,
  Smartphone,
  Bell,
  Shield,
  User,
  Palette,
  Monitor,
  Moon,
  Sun,
  Globe,
  Key,
  Download,
  Trash2,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Zap,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import { Toaster } from '../../components/ui/toaster'

const PROGRAMS = [
  { id: 'yearly-program', name: 'Yearly Program' },
  { id: 'spring-aau', name: 'Spring AAU' },
  { id: 'fall-aau', name: 'Fall AAU' },
  { id: 'summer-aau', name: 'Summer AAU' },
  { id: 'winter-aau', name: 'Winter AAU' },
  { id: 'kevin-lessons', name: 'Kevin Houston Lessons' },
  { id: 'tbf-training', name: 'TBF Training' },
  { id: 'thos-facility', name: 'THOS Facility Rentals' },
]

const MENU_ITEMS = [
  { id: 'program', label: 'Program & Fees', icon: DollarSign, description: 'Program settings and pricing' },
  { id: 'profile', label: 'Your Profile', icon: User, description: 'Personal information' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email, SMS & alerts' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme & display' },
  { id: 'integrations', label: 'Integrations', icon: Zap, description: 'Stripe, AI & SMS' },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield, description: 'Data & security' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('program')
  const [settings, setSettings] = useState({
    programName: '',
    programFee: '',
    emailFromAddress: '',
    smsFromNumber: '',
    reminderDays: '',
    lateFeeAmount: '',
    gracePeriodDays: '',
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    openaiApiKey: '',
    resendApiKey: '',
    telnexSid: '',
    telnexToken: '',
    telnexFromNumber: ''
  })
  
  const [userPreferences, setUserPreferences] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
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
    },
    privacy: {
      shareUsageData: false,
      allowAnalytics: true,
      twoFactorAuth: false,
    }
  })

  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    organization: '',
    avatar: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' },
        })
        if (response.ok) {
          const data = await response.json()
          
          if (data.systemSettings && Array.isArray(data.systemSettings)) {
            setSettings({
              programName: data.systemSettings.find((s: any) => s.key === 'program_name')?.value || '',
              programFee: data.systemSettings.find((s: any) => s.key === 'program_fee')?.value || '',
              emailFromAddress: data.systemSettings.find((s: any) => s.key === 'email_from_address')?.value || '',
              smsFromNumber: data.systemSettings.find((s: any) => s.key === 'sms_from_number')?.value || '',
              reminderDays: data.systemSettings.find((s: any) => s.key === 'reminder_days')?.value || '',
              lateFeeAmount: data.systemSettings.find((s: any) => s.key === 'late_fee_amount')?.value || '',
              gracePeriodDays: data.systemSettings.find((s: any) => s.key === 'grace_period_days')?.value || '',
              stripePublishableKey: data.systemSettings.find((s: any) => s.key === 'stripe_publishable_key')?.value || '',
              stripeSecretKey: data.systemSettings.find((s: any) => s.key === 'stripe_secret_key')?.value || '',
              stripeWebhookSecret: data.systemSettings.find((s: any) => s.key === 'stripe_webhook_secret')?.value || '',
              openaiApiKey: data.systemSettings.find((s: any) => s.key === 'openai_api_key')?.value || '',
              resendApiKey: data.systemSettings.find((s: any) => s.key === 'resend_api_key')?.value || '',
              telnexSid: data.systemSettings.find((s: any) => s.key === 'telnex_sid')?.value || '',
              telnexToken: data.systemSettings.find((s: any) => s.key === 'telnex_token')?.value || '',
              telnexFromNumber: data.systemSettings.find((s: any) => s.key === 'telnex_from_number')?.value || ''
            })
          }
          
          if (data.userPreferences) {
            const savedTheme = data.userPreferences.theme || 'system'
            if (savedTheme !== theme) setTheme(savedTheme)
            setUserPreferences(prev => ({
              ...prev,
              theme: savedTheme,
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
              },
              privacy: {
                shareUsageData: data.userPreferences.shareUsageData || false,
                allowAnalytics: data.userPreferences.allowAnalytics !== false,
                twoFactorAuth: data.userPreferences.twoFactorAuth || false,
              }
            }))
          }
          
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
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const systemSettingsArray = [
        { key: 'program_name', value: settings.programName },
        { key: 'program_fee', value: settings.programFee },
        { key: 'email_from_address', value: settings.emailFromAddress },
        { key: 'sms_from_number', value: settings.smsFromNumber },
        { key: 'reminder_days', value: settings.reminderDays },
        { key: 'late_fee_amount', value: settings.lateFeeAmount },
        { key: 'grace_period_days', value: settings.gracePeriodDays },
        { key: 'stripe_publishable_key', value: settings.stripePublishableKey },
        { key: 'stripe_secret_key', value: settings.stripeSecretKey },
        { key: 'stripe_webhook_secret', value: settings.stripeWebhookSecret },
        { key: 'openai_api_key', value: settings.openaiApiKey },
        { key: 'resend_api_key', value: settings.resendApiKey },
        { key: 'telnex_sid', value: settings.telnexSid },
        { key: 'telnex_token', value: settings.telnexToken },
        { key: 'telnex_from_number', value: settings.telnexFromNumber }
      ]

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
        shareUsageData: userPreferences.privacy.shareUsageData,
        allowAnalytics: userPreferences.privacy.allowAnalytics,
        twoFactorAuth: userPreferences.privacy.twoFactorAuth,
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024',
        },
        body: JSON.stringify({ systemSettings: systemSettingsArray, userPreferences: userPreferencesForAPI, userProfile }),
      })

      if (response.ok) {
        toast({ title: "✅ Settings saved", description: "Your changes have been saved successfully." })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
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

  const renderSection = () => {
    switch (activeSection) {
      case 'program':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Program & Fees</h2>
              <p className="text-muted-foreground">Configure your program settings and pricing structure.</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Program Selection</CardTitle>
                <CardDescription>Choose which program you're configuring</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={settings.programName || PROGRAMS[0].id}
                  onValueChange={(val) => setSettings(prev => ({ ...prev, programName: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
                <CardDescription>Set fees for this program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Program Fee</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={settings.programFee}
                        onChange={(e) => setSettings(prev => ({ ...prev, programFee: e.target.value }))}
                        placeholder="1565"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Late Fee</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={settings.lateFeeAmount}
                        onChange={(e) => setSettings(prev => ({ ...prev, lateFeeAmount: e.target.value }))}
                        placeholder="25"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Settings</CardTitle>
                <CardDescription>Configure grace periods and reminders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Grace Period (days)</Label>
                    <Input
                      type="number"
                      value={settings.gracePeriodDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, gracePeriodDays: e.target.value }))}
                      placeholder="3"
                    />
                    <p className="text-xs text-muted-foreground">Days after due date before late fee applies</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reminder Days</Label>
                    <Input
                      value={settings.reminderDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, reminderDays: e.target.value }))}
                      placeholder="7, 3, 1"
                    />
                    <p className="text-xs text-muted-foreground">Days before due date to send reminders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Communication</CardTitle>
                <CardDescription>Email and SMS sender settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={settings.emailFromAddress}
                        onChange={(e) => setSettings(prev => ({ ...prev, emailFromAddress: e.target.value }))}
                        placeholder="admin@riseasone.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>SMS From Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={settings.smsFromNumber}
                        onChange={(e) => setSettings(prev => ({ ...prev, smsFromNumber: e.target.value }))}
                        placeholder="+1-555-0123"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Your Profile</h2>
              <p className="text-muted-foreground">Manage your personal information and preferences.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{userProfile.name || 'Your Name'}</h3>
                    <p className="text-muted-foreground">{userProfile.email || 'email@example.com'}</p>
                    <Badge variant="secondary" className="mt-1">{userProfile.role || 'Admin'}</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 sm:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={userProfile.name}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={userProfile.phone}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Organization</Label>
                    <Input
                      value={userProfile.organization}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="Rise as One Basketball"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regional Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
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
                    <Label>Timezone</Label>
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
                    <Label>Date Format</Label>
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
                    <Label>Currency</Label>
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
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Notifications</h2>
              <p className="text-muted-foreground">Control how and when you receive notifications.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notification Channels</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail },
                  { key: 'sms', label: 'SMS Notifications', desc: 'Get urgent alerts via text message', icon: Smartphone },
                  { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={userPreferences.notifications[item.key as keyof typeof userPreferences.notifications]}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, [item.key]: checked }
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Types</CardTitle>
                <CardDescription>Customize which alerts you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Upcoming payment due dates' },
                  { key: 'overdueAlerts', label: 'Overdue Alerts', desc: 'High-priority overdue payment notifications' },
                  { key: 'systemUpdates', label: 'System Updates', desc: 'App updates and maintenance notices' },
                  { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Promotional content and program updates' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch 
                      checked={userPreferences.notifications[item.key as keyof typeof userPreferences.notifications]}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, [item.key]: checked }
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Appearance</h2>
              <p className="text-muted-foreground">Customize how the dashboard looks and feels.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theme</CardTitle>
                <CardDescription>Select your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, colors: 'bg-white border-2' },
                    { id: 'dark', label: 'Dark', icon: Moon, colors: 'bg-zinc-900 border-2' },
                    { id: 'system', label: 'System', icon: Monitor, colors: 'bg-gradient-to-br from-white to-zinc-900 border-2' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id)
                        setUserPreferences(prev => ({ ...prev, theme: t.id as any }))
                      }}
                      className={`p-4 rounded-xl flex flex-col items-center gap-3 transition-all ${
                        theme === t.id 
                          ? 'border-primary ring-2 ring-primary ring-offset-2' 
                          : 'border-muted hover:border-primary/50'
                      } ${t.colors}`}
                    >
                      <div className={`p-3 rounded-lg ${theme === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <t.icon className="h-6 w-6" />
                      </div>
                      <span className={`font-medium ${t.id === 'dark' ? 'text-white' : ''}`}>{t.label}</span>
                      {theme === t.id && <CheckCircle2 className={`h-5 w-5 ${t.id === 'dark' ? 'text-primary' : 'text-primary'}`} />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dashboard Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default View</Label>
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
                
                <Separator />
                
                {[
                  { key: 'showWelcomeMessage', label: 'Show Welcome Message', desc: 'Display greeting on dashboard' },
                  { key: 'compactMode', label: 'Compact Mode', desc: 'Use denser layout for more info' },
                  { key: 'autoRefresh', label: 'Auto Refresh', desc: 'Automatically update data' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch 
                      checked={userPreferences.dashboard[item.key as keyof typeof userPreferences.dashboard] as boolean}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        dashboard: { ...prev.dashboard, [item.key]: checked }
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Integrations</h2>
              <p className="text-muted-foreground">Connect third-party services and APIs.</p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#635BFF]/10">
                    <CreditCard className="h-6 w-6 text-[#635BFF]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stripe</CardTitle>
                    <CardDescription>Payment processing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.stripePublishable ? 'text' : 'password'}
                      value={settings.stripePublishableKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, stripePublishableKey: e.target.value }))}
                      placeholder="pk_test_..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('stripePublishable')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets.stripePublishable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.stripeSecret ? 'text' : 'password'}
                      value={settings.stripeSecretKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, stripeSecretKey: e.target.value }))}
                      placeholder="sk_test_..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('stripeSecret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets.stripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input
                    type="password"
                    value={settings.stripeWebhookSecret}
                    onChange={(e) => setSettings(prev => ({ ...prev, stripeWebhookSecret: e.target.value }))}
                    placeholder="whsec_..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Zap className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">OpenAI</CardTitle>
                    <CardDescription>AI-powered features</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.openai ? 'text' : 'password'}
                      value={settings.openaiApiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('openai')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Resend</CardTitle>
                    <CardDescription>Email delivery</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={settings.resendApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, resendApiKey: e.target.value }))}
                    placeholder="re_..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <MessageSquare className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Telnex</CardTitle>
                    <CardDescription>SMS messaging</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Account SID</Label>
                    <Input
                      value={settings.telnexSid}
                      onChange={(e) => setSettings(prev => ({ ...prev, telnexSid: e.target.value }))}
                      placeholder="Your SID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Token</Label>
                    <Input
                      type="password"
                      value={settings.telnexToken}
                      onChange={(e) => setSettings(prev => ({ ...prev, telnexToken: e.target.value }))}
                      placeholder="Your token"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>From Number</Label>
                  <Input
                    value={settings.telnexFromNumber}
                    onChange={(e) => setSettings(prev => ({ ...prev, telnexFromNumber: e.target.value }))}
                    placeholder="+1..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Privacy & Security</h2>
              <p className="text-muted-foreground">Manage your data and security settings.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'shareUsageData', label: 'Share Usage Data', desc: 'Help improve the app with anonymous data' },
                  { key: 'allowAnalytics', label: 'Allow Analytics', desc: 'Enable usage analytics collection' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch 
                      checked={userPreferences.privacy[item.key as keyof typeof userPreferences.privacy] as boolean}
                      onCheckedChange={(checked) => setUserPreferences(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, [item.key]: checked }
                      }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-lg text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export All Data</p>
                    <p className="text-sm text-muted-foreground">Download a copy of all your data</p>
                  </div>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Reset All Settings</p>
                    <p className="text-sm text-muted-foreground">This cannot be undone</p>
                  </div>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)]">
        {/* Sidebar Navigation */}
        <aside className="lg:w-72 shrink-0">
          <div className="sticky top-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-6 w-6" />
                Settings
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your preferences</p>
            </div>
            
            <nav className="space-y-1">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${activeSection === item.id ? '' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.label}</p>
                    <p className={`text-xs truncate ${activeSection === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${activeSection === item.id ? '' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </nav>
            
            {/* Save Button - Sidebar */}
            <div className="mt-6 pt-6 border-t">
              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {renderSection()}
        </main>
      </div>
      <Toaster />
    </AppLayout>
  )
}
