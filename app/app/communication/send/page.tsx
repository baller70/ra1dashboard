
'use client'

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
} from '../../../components/ui/dropdown-menu'

interface Parent {
  _id: string
  name: string
  email: string
  phone?: string
}

interface Template {
  id: string
  name: string
  subject: string
  body: string
  category: string
  channel: string
  isActive: boolean
}

function SendMessagePageContent() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')
  const parentId = searchParams.get('parentId')
  const parentName = searchParams.get('parentName')
  const parentEmail = searchParams.get('parentEmail')
  const context = searchParams.get('context')
  const paymentId = searchParams.get('paymentId')
  
  const [parents, setParents] = useState<Parent[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('email')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  // Scheduling state
  const [scheduleMessage, setScheduleMessage] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    fetchData()
  }, [templateId, parentId])

  // Set default date/time for scheduling (next hour)
  useEffect(() => {
    const now = new Date()
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
    
    // Format date as YYYY-MM-DD
    const dateStr = nextHour.toISOString().split('T')[0]
    setScheduledDate(dateStr)
    
    // Format time as HH:MM
    const timeStr = nextHour.toTimeString().slice(0, 5)
    setScheduledTime(timeStr)
  }, [])

  const fetchData = async () => {
    try {
      const [parentsRes, templatesRes] = await Promise.all([
        fetch('/api/parents'),
        fetch('/api/templates')
      ])

      if (parentsRes.ok) {
        const parentsData = await parentsRes.json()
        // Extract the parents array from the API response structure
        const parentsArray = Array.isArray(parentsData) 
          ? parentsData 
          : (parentsData.data?.parents || parentsData.parents || [])
        setParents(parentsArray)
        
        // If parentId is provided from payment page, pre-select that parent
        if (parentId) {
          setSelectedParents([parentId])
          
          // If parent info is provided in URL but not found in API, add it temporarily
          if (parentName && parentEmail && !parentsArray.find((p: Parent) => p._id === parentId)) {
            const tempParent: Parent = {
              _id: parentId,
              name: decodeURIComponent(parentName),
              email: decodeURIComponent(parentEmail)
            }
            setParents(prev => [tempParent, ...prev])
          }
        }
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        const templatesArray = Array.isArray(templatesData) ? templatesData : templatesData.templates || []
        setTemplates(templatesArray)
        
        // If templateId is provided, pre-select that template
        if (templateId) {
          const template = templatesArray.find((t: Template) => t.id === templateId)
          if (template) {
            handleTemplateSelect(template)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setSubject(template.subject)
    setBody(template.body)
    setChannel(template.channel || 'email')
  }

  const handleParentToggle = (parentId: string) => {
    setSelectedParents(prev => 
      prev.includes(parentId) 
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    )
  }

  const selectAllParents = () => {
    const filteredParents = getFilteredParents()
    const allFilteredIds = filteredParents.map(p => p._id)
    setSelectedParents(prev => {
      const newSelected = [...prev]
      allFilteredIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      return newSelected
    })
  }

  const clearSelection = () => {
    setSelectedParents([])
  }

  const getFilteredParents = () => {
    if (!searchTerm.trim()) return parents
    
    return parents.filter(parent => 
      parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const getSelectedParentNames = () => {
    if (selectedParents.length === 0) return 'No recipients selected'
    if (selectedParents.length === 1) {
      const parent = parents.find(p => p._id === selectedParents[0])
      return parent ? parent.name : '1 recipient'
    }
    return `${selectedParents.length} recipients selected`
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please provide both subject and message body')
      return
    }

    if (selectedParents.length === 0) {
      toast.error('Please select at least one parent')
      return
    }

    // Validate scheduling if enabled
    if (scheduleMessage) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please provide both date and time for scheduling')
        return
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      const now = new Date()
      
      if (scheduledDateTime <= now) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    setSending(true)
    try {
      const endpoint = scheduleMessage ? '/api/messages/scheduled' : '/api/emails/send'
      const requestBody: any = {
        parentIds: selectedParents,
        templateId: selectedTemplate?.id,
        subject,
        body,
        channel,
        customizePerParent: true
      }

      // Add scheduling info if enabled
      if (scheduleMessage) {
        requestBody.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        
        if (scheduleMessage) {
          toast.success(`📅 Messages Scheduled Successfully!`, {
            description: `${selectedParents.length} messages scheduled for ${scheduledDate} at ${scheduledTime}`,
            duration: 6000,
          })
        } else {
          // Enhanced success message with more details
          const successCount = result.summary?.sent || selectedParents.length
          const totalCount = selectedParents.length
          
          toast.success(`✅ Messages Sent Successfully!`, {
            description: `${successCount} of ${totalCount} messages sent via ${channel.toUpperCase()} using Resend`,
            duration: 6000,
          })
        }

        // Reset form
        setSelectedParents([])
        setSubject('')
        setBody('')
        setSelectedTemplate(null)
        setScheduleMessage(false)
      } else {
        const error = await response.json()
        toast.error(`❌ Failed to ${scheduleMessage ? 'Schedule' : 'Send'} Messages`, {
          description: error.error || 'An unexpected error occurred',
          duration: 7000,
        })
      }
    } catch (error) {
      console.error('Error sending messages:', error)
      toast.error('Network error occurred. Please try again.')
    } finally {
      setSending(false)
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
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communication
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Send Message</h1>
              <p className="text-gray-600">Send personalized messages to parents</p>
            </div>
          </div>
        </div>

        {/* Context Banner */}
        {context && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {context === 'overdue_payment' && 'Payment Reminder Context'}
                  {context === 'welcome' && 'Welcome Message Context'}
                  {context === 'general' && 'General Communication'}
                </p>
                <p className="text-xs text-blue-700">
                  {context === 'overdue_payment' && 'This message is being sent regarding an overdue payment.'}
                  {context === 'welcome' && 'This is a welcome message for new parents.'}
                  {context === 'general' && 'General communication message.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Recipients Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recipients
                </div>
                <Badge variant="outline" className="font-normal">
                  {selectedParents.length} of {parents.length} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recipient Selection Dropdown */}
                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12">
                      <span className="truncate text-left">{getSelectedParentNames()}</span>
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[500px] max-h-96 p-0" align="start">
                    <div className="p-4 space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search parents by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                      
                      {/* Bulk Actions */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <span className="text-sm font-medium text-gray-700">
                          {getFilteredParents().length} parent{getFilteredParents().length !== 1 ? 's' : ''} found
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllParents}
                            className="h-8 px-3 text-xs hover:bg-blue-50"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Select All
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={clearSelection}
                            className="h-8 px-3 text-xs hover:bg-red-50"
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>
                      
                      {/* Scrollable Parent List */}
                      <div className="max-h-64 overflow-y-auto border rounded-md bg-gray-50">
                        <div className="p-2 space-y-1">
                          {getFilteredParents().map((parent, index) => (
                            <div
                              key={parent._id}
                              className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all duration-200 ${
                                selectedParents.includes(parent._id)
                                  ? 'bg-blue-100 border-blue-200 border'
                                  : 'bg-white hover:bg-blue-50 border border-transparent'
                              }`}
                              onClick={() => handleParentToggle(parent._id)}
                            >
                              <div className="flex-shrink-0">
                                <Checkbox
                                  checked={selectedParents.includes(parent._id)}
                                  onChange={() => handleParentToggle(parent._id)}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {parent.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {parent.email}
                                </p>
                                {parent.phone && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {parent.phone}
                                  </p>
                                )}
                              </div>
                              {selectedParents.includes(parent._id) && (
                                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          
                          {getFilteredParents().length === 0 && (
                            <div className="p-6 text-center">
                              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">
                                {searchTerm ? `No parents found matching "${searchTerm}"` : 'No parents available'}
                              </p>
                              {searchTerm && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSearchTerm('')}
                                  className="mt-2 text-xs"
                                >
                                  Clear search
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Selection Summary */}
                      {selectedParents.length > 0 && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-700">
                              {selectedParents.length} recipient{selectedParents.length !== 1 ? 's' : ''} selected
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsDropdownOpen(false)}
                              className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Selected Recipients Preview */}
                {selectedParents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedParents.slice(0, 5).map(parentId => {
                      const parent = parents.find(p => p._id === parentId)
                      return parent ? (
                        <Badge key={parentId} variant="secondary" className="text-xs">
                          {parent.name}
                        </Badge>
                      ) : null
                    })}
                    {selectedParents.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedParents.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template Selection - Show 6 templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Select Template (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 max-h-80 overflow-y-auto">
                  {Array.isArray(templates) && templates.filter(t => t.isActive).slice(0, 6).map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant="outline" className="text-xs">{template.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.subject}</p>
                    </div>
                  ))}
                  
                  {Array.isArray(templates) && templates.filter(t => t.isActive).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No active templates available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <span>Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="sms"
                        checked={channel === 'sms'}
                        onChange={(e) => setChannel(e.target.value)}
                      />
                      <Smartphone className="h-4 w-4" />
                      <span>SMS</span>
                    </label>
                  </div>
                </div>

                {/* Schedule Message Toggle */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Schedule Message</span>
                  </div>
                  <Switch
                    checked={scheduleMessage}
                    onCheckedChange={setScheduleMessage}
                  />
                </div>

                {/* Scheduling Fields */}
                {scheduleMessage && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
                    <div>
                      <label className="text-xs font-medium text-blue-900">Date</label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
                        <Input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="pl-8 text-sm"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-blue-900">Time</label>
                      <div className="relative mt-1">
                        <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600" />
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="pl-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={8}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use variables: {'{parentName}'}, {'{parentEmail}'}, {'{parentPhone}'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSend}
                    disabled={sending || selectedParents.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {scheduleMessage ? 'Scheduling...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        {scheduleMessage ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Schedule Messages ({selectedParents.length})
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send via Resend ({selectedParents.length})
                          </>
                        )}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {scheduleMessage 
                      ? `Messages will be scheduled for ${scheduledDate} at ${scheduledTime}`
                      : 'Messages will be sent immediately using Resend email service'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function SendMessagePage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    }>
      <SendMessagePageContent />
    </Suspense>
  )
}
