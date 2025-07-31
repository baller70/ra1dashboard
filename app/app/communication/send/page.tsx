
'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { Switch } from '../../../components/ui/switch'
import { 
  Send, 
  Users, 
  Mail, 
  Smartphone, 
  MessageSquare,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Wand2,
  ChevronDown,
  Search,
  UserCheck,
  UserX,
  Clock,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../../components/ui/dropdown-menu'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'
interface Parent {
  _id: string
  name: string
  email: string
  phone?: string
}

interface Template {
  _id: string
  name: string
  subject: string
  body: string
  content?: string
  isActive: boolean
}

// Separate component for search params to handle Suspense properly
function CommunicationSendContent() {
  const searchParams = useSearchParams()
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Initialize scheduled date/time to next hour
  useEffect(() => {
    const now = new Date()
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
    setScheduledDate(nextHour.toISOString().split('T')[0])
    setScheduledTime(nextHour.toTimeString().slice(0, 5))
  }, [])

  // Fetch parents and templates
  useEffect(() => {
    fetchParents()
    fetchTemplates()
  }, [])

  // Handle URL parameters
  useEffect(() => {
    const parentId = searchParams.get('parentId')
    if (parentId) {
      setSelectedParents([parentId])
    }
  }, [searchParams])

  const fetchParents = async () => {
    try {
      const response = await fetch('/api/parents?limit=1000')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      // Handle different response formats with better validation
      let parentsArray: Parent[] = []
      
      if (Array.isArray(data)) {
        parentsArray = data
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.data?.parents)) {
          parentsArray = data.data.parents
        } else if (Array.isArray(data.parents)) {
          parentsArray = data.parents
        } else if (Array.isArray(data.data)) {
          parentsArray = data.data
        }
      }
      
      // Ensure we have valid parent objects with required fields
      const validParents = parentsArray.filter(parent => 
        parent && 
        typeof parent === 'object' && 
        parent._id && 
        parent.name && 
        parent.email
      )
      
      setParents(validParents)
    } catch (error) {
      console.error('Failed to fetch parents:', error)
      toast.error('Failed to load parents')
      setParents([]) // Set empty array on error
    }
  }

  const fetchTemplates = async () => {
    try {
      console.log('🔄 Fetching templates...')
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('📋 Templates data received:', data)
      
      // Ensure data is an array before filtering
      const templatesArray = Array.isArray(data) ? data : []
      console.log('📊 Templates array:', templatesArray.length, 'templates')
      
      const activeTemplates = templatesArray.filter((template: Template) => {
        console.log('🔍 Checking template:', template.name, 'isActive:', template.isActive)
        return template.isActive
      })
      console.log('✅ Active templates:', activeTemplates.length)
      
      setTemplates(activeTemplates.slice(0, 6)) // Show up to 6 templates
      
      if (activeTemplates.length === 0) {
        toast.error('No active templates found. Please create some templates first.')
      }
    } catch (error) {
      console.error('❌ Failed to fetch templates:', error)
      toast.error('Failed to load templates. Please refresh the page.')
      setTemplates([]) // Set empty array on error
    }
  }

  const handleParentToggle = (parentId: string) => {
    setSelectedParents(prev => 
      prev.includes(parentId) 
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    )
  }

  const handleSelectAll = () => {
    const filteredParents = parents.filter(parent =>
      parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const allIds = filteredParents.map(parent => parent._id)
    
    // If all filtered parents are already selected, do nothing or show message
    if (allIds.length === 0) {
      toast.error('No parents match your search criteria')
      return
    }
    
    setSelectedParents(prev => {
      // Merge with existing selections (don't replace)
      const newSelections = [...new Set([...prev, ...allIds])]
      toast.success(`Selected ${allIds.length} additional parents`)
      return newSelections
    })
  }

  const handleClearAll = () => {
    setSelectedParents([])
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t._id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setSubject(template.subject || '')
      setMessage(template.body || template.content || '')
      
      // Provide user feedback
      toast.success(`Template "${template.name}" applied successfully!`)
      console.log('✅ Template selected:', template.name)
    } else {
      console.error('❌ Template not found:', templateId)
      toast.error('Template not found. Please try again.')
    }
  }

  const validateScheduledDateTime = () => {
    if (!scheduleMessage) return true
    
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    const now = new Date()
    
    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return false
    }
    
    return true
  }

  const handleSend = async () => {
    if (selectedParents.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message')
      return
    }

    if (!validateScheduledDateTime()) {
      return
    }

    setIsLoading(true)

    try {
      const endpoint = scheduleMessage ? '/api/messages/scheduled' : '/api/emails/send'
      const payload = {
        parentIds: selectedParents,
        subject: subject.trim(),
        message: message.trim(),
        ...(scheduleMessage && {
          scheduledFor: new Date(`${scheduledDate}T${scheduledTime}`).getTime()
        })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      
      if (scheduleMessage) {
        toast.success(`Message scheduled successfully for ${new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}`)
      } else {
        toast.success(`Message sent successfully via Resend to ${selectedParents.length} recipient(s)`)
      }

      // Reset form
      setSelectedParents([])
      setSubject('')
      setMessage('')
      setSelectedTemplate('')
      setScheduleMessage(false)
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredParents = parents.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedParentNames = parents
    .filter(parent => selectedParents.includes(parent._id))
    .map(parent => parent.name)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Communication</h1>
            <p className="text-muted-foreground">
              Send messages to parents via email using Resend
            </p>
          </div>
          <Link href="/communication">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Communication
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipients Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recipients ({selectedParents.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12 min-w-[500px]"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className="truncate">
                        {selectedParents.length === 0
                          ? 'Select parents...'
                          : selectedParents.length === 1
                          ? selectedParentNames[0]
                          : `${selectedParents.length} parents selected`
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[500px] p-4">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search parents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Select All / Clear All */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="flex-1"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="flex-1"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>

                    {/* Parent List */}
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredParents.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No parents found
                        </p>
                      ) : (
                        filteredParents.map((parent) => (
                          <div
                            key={parent._id}
                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedParents.includes(parent._id)
                                ? 'bg-blue-50 border-2 border-blue-200'
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => handleParentToggle(parent._id)}
                          >
                            <Checkbox
                              checked={selectedParents.includes(parent._id)}
                              onCheckedChange={() => handleParentToggle(parent._id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{parent.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{parent.email}</p>
                            </div>
                            {selectedParents.includes(parent._id) && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Done Button */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full"
                      >
                        Done ({selectedParents.length} selected)
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Selected Parents Preview */}
                {selectedParents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Selected Recipients:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedParentNames.slice(0, 10).map((name, index) => (
                        <Badge key={index} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                      {selectedParents.length > 10 && (
                        <Badge variant="secondary">
                          +{selectedParents.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Message Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={scheduleMessage}
                    onCheckedChange={setScheduleMessage}
                  />
                  <label className="text-sm font-medium">
                    Schedule message for later
                  </label>
                </div>

                {scheduleMessage && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Date
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Time
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="Enter message subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Send Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSend}
                  disabled={isLoading || selectedParents.length === 0 || !subject.trim() || !message.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {scheduleMessage ? 'Scheduling...' : 'Sending via Resend...'}
                    </>
                  ) : (
                    <>
                      {scheduleMessage ? (
                        <Clock className="h-4 w-4 mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {scheduleMessage ? 'Schedule Message' : 'Send via Resend'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Select Template (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No active templates found
                    </p>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplate === template._id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleTemplateSelect(template._id)}
                      >
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {template.subject}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/communication/templates">
                  <Button variant="outline" className="w-full justify-start">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Manage Templates
                  </Button>
                </Link>
                <Link href="/communication/history">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </Link>
                <Link href="/communication/scheduled">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Scheduled Messages
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// Main component with Suspense wrapper
export default function CommunicationSendPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    }>
      <CommunicationSendContent />
    </Suspense>
  )
}
