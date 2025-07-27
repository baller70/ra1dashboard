// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../../components/app-layout'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Separator } from '../../../../components/ui/separator'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Send, 
  Copy,
  Eye,
  Calendar,
  Mail,
  Smartphone,
  MessageSquare,
  Wand2
} from 'lucide-react'
import Link from 'next/link'
import { TemplateWithRelations } from '../../../../lib/types'

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setTemplate(data)
        } else {
          router.push('/communication')
        }
      } catch (error) {
        console.error('Failed to fetch template:', error)
        router.push('/communication')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTemplate()
    }
  }, [params.id, router])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/templates/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/communication')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!template) return

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          category: template.category,
          channel: template.channel,
          variables: template.variables
        })
      })

      if (response.ok) {
        const newTemplate = await response.json()
        router.push(`/communication/templates/${newTemplate.id}`)
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error)
    }
  }

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

  if (!template) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Template not found</h3>
          <p className="text-muted-foreground mb-4">
            The template you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/communication">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communication
            </Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                {template.name}
                {template.isAiGenerated && (
                  <Badge variant="outline" className="text-xs">
                    <Wand2 className="mr-1 h-3 w-3" />
                    AI Generated
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">
                Template details and usage history
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button asChild variant="outline">
              <Link href={`/communication/templates/${template.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/communication/send?templateId=${template.id}`}>
                <Send className="mr-2 h-4 w-4" />
                Use Template
              </Link>
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Template Details */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle>Template Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="mt-1 font-medium">{template.subject}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message Body</label>
                  <div className="mt-1 p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{template.body}</pre>
                  </div>
                </div>
                {(template.variables?.length ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Variables Used</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const variables = template.variables ? JSON.parse(template.variables) as string[] : []
                            return variables.map((variable) => (
                              <Badge key={variable} variant="outline">
                                {`{${variable}}`}
                              </Badge>
                            ))
                          } catch {
                            return null
                          }
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Message History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {(template.messageLogs?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {(template.messageLogs ?? []).slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Parent ID: {log.parentId}</p>
                          <p className="text-sm text-muted-foreground">Message sent</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={log.status === 'sent' ? 'default' : 'secondary'}>
                            {log.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(template.messageLogs?.length ?? 0) > 10 && (
                      <p className="text-center text-sm text-muted-foreground">
                        And {(template.messageLogs?.length ?? 0) - 10} more...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No messages sent with this template yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant={getCategoryVariant(template.category)}>
                    {template.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Channel</span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    {getChannelIcon(template.channel)}
                    <span>{template.channel}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={template.isActive ? 'default' : 'secondary'}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Usage Count</span>
                  <span className="font-medium">{template.usageCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm">{new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Messages */}
            {(template.scheduledMessages?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(template.scheduledMessages ?? []).map((message) => (
                      <div key={message.id} className="p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(message.scheduledFor).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(message.recipients?.length ?? 0)} recipients
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {message.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
