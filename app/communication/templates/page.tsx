
// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Separator } from '../../../components/ui/separator'
import { 
  Plus, 
  Search, 
  Filter,
  Mail,
  Smartphone,
  MessageSquare,
  Edit,
  Eye,
  Trash2,
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  Wand2,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { TemplateWithRelations } from '../../../lib/types'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [enhancing, setEnhancing] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    const matchesChannel = channelFilter === 'all' || template.channel === channelFilter
    
    return matchesSearch && matchesCategory && matchesChannel
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <Smartphone className="h-4 w-4" />
      case 'both':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const handleAIEnhance = async (templateId: string, improvementType: string) => {
    setEnhancing(templateId)
    try {
      const response = await fetch(`/api/templates/${templateId}/ai-enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          improvementType,
          desiredTone: 'professional',
          specificInstructions: `Enhance this template for better ${improvementType} while maintaining the core message and professional tone.`
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`AI enhancement completed! New version ${result.version} created.`)
        fetchTemplates() // Refresh templates
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to enhance template')
      }
    } catch (error) {
      console.error('AI enhancement error:', error)
      alert('Failed to enhance template')
    } finally {
      setEnhancing(null)
    }
  }

  const categories = ['all', 'welcome', 'payments', 'reminder', 'overdue', 'confirmation', 'announcement', 'receipt']
  const channels = ['all', 'email', 'sms', 'both']

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
            <h1 className="text-3xl font-bold tracking-tight">AI-Enhanced Templates</h1>
            <p className="text-muted-foreground">
              Manage and optimize your message templates with AI assistance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
              <Brain className="mr-1 h-3 w-3" />
              AI Powered
            </Badge>
            <Button asChild>
              <Link href="/communication/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  {channels.map(channel => (
                    <option key={channel} value={channel}>
                      {channel === 'all' ? 'All Channels' : channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-all duration-200 border border-muted/80 hover:border-purple-200 rounded-2xl bg-white"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getChannelIcon(template.channel)}
                      <CardTitle className="text-lg font-semibold truncate">
                        {template.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      {template.isAiGenerated && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                          <Sparkles className="mr-1 h-3 w-3" />
                          AI
                        </Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Template Preview */}
                  <div>
                    {template.subject && (
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Subject: {template.subject}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.body}
                    </p>
                  </div>

                  {/* Template Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{template.usageCount} uses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{template.messageLogs?.length || 0} sent</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Enhancement Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center">
                        <Brain className="mr-2 h-4 w-4 text-purple-600" />
                        AI Enhancements
                      </h4>
                      {template.versions && template.versions.length > 1 && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {template.versions.length} versions
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAIEnhance(template.id, 'effectiveness')}
                        disabled={enhancing === template.id}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs"
                      >
                        {enhancing === template.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1" />
                        ) : (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        )}
                        Optimize
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAIEnhance(template.id, 'personalization')}
                        disabled={enhancing === template.id}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs"
                      >
                        {enhancing === template.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1" />
                        ) : (
                          <Wand2 className="mr-1 h-3 w-3" />
                        )}
                        Personalize
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAIEnhance(template.id, 'clarity_enhancement')}
                        disabled={enhancing === template.id}
                        className="border-green-200 text-green-700 hover:bg-green-50 text-xs"
                      >
                        {enhancing === template.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1" />
                        ) : (
                          <Zap className="mr-1 h-3 w-3" />
                        )}
                        Clarity
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAIEnhance(template.id, 'tone_adjustment')}
                        disabled={enhancing === template.id}
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 text-xs"
                      >
                        {enhancing === template.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-1" />
                        ) : (
                          <MessageSquare className="mr-1 h-3 w-3" />
                        )}
                        Tone
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild className="rounded-full px-3">
                        <Link href={`/communication/templates/${template.id}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="rounded-full px-3">
                        <Link href={`/communication/templates/${template.id}/edit`}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="rounded-full px-3">
                        <Link href={`/communication/send?templateId=${template.id}`}>
                          <Send className="mr-1 h-3 w-3" />
                          Send
                        </Link>
                      </Button>
                    </div>
                    
                    <div className="flex space-x-1">
                      {template.versions && template.versions.length > 0 && (
                        <Button size="sm" variant="ghost" asChild title="Template versions">
                          <Link href={`/communication/templates/${template.id}/versions`}>
                            <BarChart3 className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        title="Delete template"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== 'all' || channelFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first template to get started'
                }
              </p>
              <Button asChild>
                <Link href="/communication/templates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
