'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../../../components/app-layout'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import { Textarea } from '../../../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { 
  ArrowLeft,
  Save,
  Mail,
  Smartphone,
  MessageSquare,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category: string
  channel: string
  variables: string[]
  isAiGenerated: boolean
  usageCount: number
}

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [channel, setChannel] = useState('email')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
        setName(data.name)
        setSubject(data.subject)
        setBody(data.body)
        setCategory(data.category)
        setChannel(data.channel)
      } else {
        toast.error('Template not found')
        router.push('/communication')
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
      toast.error('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          subject,
          body,
          category,
          channel,
          variables: extractVariables(body)
        })
      })

      if (response.ok) {
        toast.success('Template updated successfully')
        router.push('/communication')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Template update error:', error)
      toast.error('Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Template deleted successfully')
        router.push('/communication')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Template deletion error:', error)
      toast.error('Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
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
            <Button asChild variant="outline" size="sm">
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communication
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
              <p className="text-muted-foreground">
                Modify template "{template.name}"
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Template
              </>
            )}
          </Button>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="general">General</option>
                    <option value="welcome">Welcome</option>
                    <option value="reminder">Reminder</option>
                    <option value="overdue">Overdue</option>
                    <option value="confirmation">Confirmation</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Channel</label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="email"
                        checked={channel === 'email'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="sms"
                        checked={channel === 'sms'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm">SMS</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="both"
                        checked={channel === 'both'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">Both</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Subject *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message Body *</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter your message template..."
                  rows={10}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use variables: {'{parentName}'}, {'{parentEmail}'}, {'{parentPhone}'}, {'{amount}'}, {'{dueDate}'}
                </p>
              </div>

              {template.isAiGenerated && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This template was originally generated by AI and has been used {template.usageCount} times.
                  </p>
                </div>
              )}

              {extractVariables(body).length > 0 && (
                <div>
                  <label className="text-sm font-medium">Detected Variables</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {extractVariables(body).map((variable, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {'{' + variable + '}'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
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
                <Button asChild variant="outline">
                  <Link href="/communication">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
