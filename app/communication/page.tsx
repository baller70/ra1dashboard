// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation

import { useState, useEffect } from 'react'

import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
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
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { TemplateWithRelations } from '../../lib/types'
import { toast } from 'sonner'

export default function CommunicationPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [searchTerm, categoryFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      
      const response = await fetch(`/api/templates?${params}`, {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      const data = await response.json()
      setTemplates(data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast.error('Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
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
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  try {
                    const finalTemplate = JSON.parse(buffer)
                    // Add the new template to the list
                    // setTemplates(prev => [finalTemplate, ...prev]) // This line is removed as templates are now managed by Convex
                    setAiPrompt('')
                    setShowAIGenerator(false)
                    return
                  } catch (e) {
                    console.error('Failed to parse final template:', e)
                  }
                }
                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.content
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate template:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleQuickDraft = async (template: any) => {
    try {
      // For quick draft, we'll redirect to the send page with the template pre-selected
      window.location.href = `/communication/send?templateId=${template._id || template.id}`
    } catch (error) {
      console.error('Failed to create quick draft:', error)
      toast.error('Failed to create draft')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = (template.name && template.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (template.subject && template.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (template.body && template.body.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    
    return matchesSearch && matchesCategory
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

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case 'welcome':
        return 'default'
      case 'reminder':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      case 'confirmation':
        return 'outline'
      default:
        return 'outline'
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
            <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
            <p className="text-muted-foreground">
              Manage message templates and send communications to parents
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              onClick={() => setShowAIGenerator(!showAIGenerator)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              AI Generate
            </Button>
            <Button asChild variant="outline">
              <Link href="/communication/history">
                <Eye className="mr-2 h-4 w-4" />
                Message History
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/communication/send">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Link>
            </Button>
            <Button asChild>
              <Link href="/communication/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Link>
            </Button>
          </div>
        </div>

        {/* AI Generator */}
        {showAIGenerator && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                AI Template Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the type of message you want to create. For example: 'Create a payment reminder message for overdue payments that sounds professional but friendly'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleGenerateTemplate}
                  disabled={!aiPrompt.trim() || generating}
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Template
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAIGenerator(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search templates by name or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Categories</option>
                <option value="welcome">Welcome</option>
                <option value="reminder">Reminder</option>
                <option value="overdue">Overdue</option>
                <option value="confirmation">Confirmation</option>
                <option value="general">General</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <div className="grid gap-4">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <Card key={template._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        {template.isAiGenerated && (
                          <Badge variant="outline" className="text-xs">
                            <Wand2 className="mr-1 h-3 w-3" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground font-medium">{template.subject}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.body ? `${template.body.substring(0, 150)}...` : 'No content'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getCategoryVariant(template.category || 'general')}>
                          {template.category}
                        </Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          {getChannelIcon(template.channel || 'email')}
                          <span>{template.channel}</span>
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Used {template.usageCount} times
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/communication/templates/${template._id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/communication/templates/${template._id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleQuickDraft(template as any)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Try adjusting your search criteria'
                      : 'Create your first message template to get started'
                    }
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <Button asChild variant="outline">
                      <Link href="/communication/templates/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                      </Link>
                    </Button>
                    <Button onClick={() => setShowAIGenerator(true)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      AI Generate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
