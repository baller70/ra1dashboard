// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Mail,
  Smartphone,
  Wand2,
  Send,
  Eye,
  Edit,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  History,
  Heart,
  Calendar,
  Sparkles,
  X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const JOURNEY_STEPS = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Onboard new parents',
    icon: Heart,
    color: 'bg-pink-500',
    action: '/communication/send?type=welcome'
  },
  {
    id: 2,
    title: 'Reminder',
    description: 'Upcoming payments',
    icon: Calendar,
    color: 'bg-blue-500',
    action: '/communication/send?type=reminder'
  },
  {
    id: 3,
    title: 'Overdue',
    description: 'Past due notices',
    icon: AlertCircle,
    color: 'bg-red-500',
    action: '/communication/send?type=overdue'
  },
  {
    id: 4,
    title: 'Thank You',
    description: 'Payment received',
    icon: CheckCircle2,
    color: 'bg-green-500',
    action: '/communication/send?type=confirmation'
  },
]

export default function CommunicationPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ sent: 0, opened: 0, templates: 0 })

  useEffect(() => {
    fetchTemplates()
    fetchStats()
  }, [searchTerm, categoryFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      
      const response = await fetch(`/api/templates?${params}`, {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      })
      const data = await response.json()
      setTemplates(data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/messages/stats', {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      // Stats are optional
    }
  }

  const handleGenerateTemplate = async () => {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    try {
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          category: 'general',
          channel: 'email'
        }),
      })

      if (response.ok) {
        const newTemplate = await response.json()
        if (newTemplate && newTemplate._id) {
          setTemplates(prev => [newTemplate, ...prev])
          toast.success('✅ AI template generated!')
          setAiPrompt('')
          setShowAIGenerator(false)
        }
      } else {
        toast.error('Failed to generate template')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setGenerating(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-3.5 w-3.5" />
      case 'sms': return <Smartphone className="h-3.5 w-3.5" />
      default: return <MessageSquare className="h-3.5 w-3.5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'welcome': return 'bg-pink-100 text-pink-700'
      case 'reminder': return 'bg-blue-100 text-blue-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      case 'confirmation': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case 'welcome': return 'border-l-pink-500'
      case 'reminder': return 'border-l-blue-500'
      case 'overdue': return 'border-l-red-500'
      case 'confirmation': return 'border-l-green-500'
      default: return 'border-l-slate-400'
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
      <div className="max-w-7xl mx-auto space-y-8 pb-8">
        
        {/* Clean Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pt-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Communications</h1>
            <p className="text-slate-500 mt-1">
              Manage templates and send messages to parents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowAIGenerator(!showAIGenerator)}
              className="rounded-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generate
            </Button>
            <Button asChild className="rounded-full bg-slate-900 hover:bg-slate-800">
              <Link href="/communication/send">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
                <p className="text-sm text-slate-500">Templates</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.sent || 0}</p>
                <p className="text-sm text-slate-500">Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.opened || 0}%</p>
                <p className="text-sm text-slate-500">Open Rate</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">84</p>
                <p className="text-sm text-slate-500">Parents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Journey Actions */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50/50">
            <h2 className="font-semibold text-slate-900">Quick Send</h2>
            <p className="text-sm text-slate-500">Common message types for the parent journey</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0">
            {JOURNEY_STEPS.map((step) => (
              <Link key={step.id} href={step.action} className="group">
                <div className="p-6 hover:bg-slate-50 transition-colors text-center">
                  <div className={`w-12 h-12 mx-auto rounded-xl ${step.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-0.5">{step.title}</h3>
                  <p className="text-xs text-slate-500">{step.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Generator Panel */}
        {showAIGenerator && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI Message Generator</h3>
                  <p className="text-sm text-slate-500">Describe what you want to say</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAIGenerator(false)} className="rounded-full h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Example: Write a friendly reminder for parents whose payment is due in 3 days..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="resize-none bg-white mb-4"
            />
            <Button 
              onClick={handleGenerateTemplate} 
              disabled={!aiPrompt.trim() || generating}
              className="rounded-full"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>
          </div>
        )}

        {/* Templates Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Message Templates</h2>
              <p className="text-slate-500 text-sm">Reusable templates for quick messaging</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48 rounded-full bg-white"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 rounded-full bg-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/communication/templates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Link>
              </Button>
            </div>
          </div>

          {templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div 
                  key={template._id} 
                  className={`bg-white rounded-xl border-l-4 ${getCategoryBorderColor(template.category)} border shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">{template.name}</h3>
                          {template.isAiGenerated && (
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">{template.subject}</p>
                      </div>
                      <Badge className={`${getCategoryColor(template.category)} text-xs shrink-0`}>
                        {template.category || 'general'}
                      </Badge>
                    </div>
                    
                    {/* Preview */}
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {template.body ? template.body.substring(0, 120) + '...' : 'No content preview'}
                    </p>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {getChannelIcon(template.channel)}
                        <span className="capitalize">{template.channel || 'email'}</span>
                        <span className="mx-1">•</span>
                        <span>Used {template.usageCount || 0}x</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                          <Link href={`/communication/templates/${template._id}`}>
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                          <Link href={`/communication/templates/${template._id}/edit`}>
                            <Edit className="h-4 w-4 text-slate-500" />
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 rounded-full px-3 bg-slate-900 hover:bg-slate-800"
                          asChild
                        >
                          <Link href={`/communication/send?templateId=${template._id}`}>
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Send
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates found</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Create your first template to streamline communication'
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/communication/templates/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Link>
                </Button>
                <Button onClick={() => setShowAIGenerator(true)} className="rounded-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Generate
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Footer */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/communication/history" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
            <History className="h-4 w-4" />
            Message History
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/communication/send?audience=all" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
            <Users className="h-4 w-4" />
            Send to All Parents
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/communication/send?audience=overdue" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
            <AlertCircle className="h-4 w-4" />
            Overdue Reminders
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
