'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft, 
  Calendar, 
  Clock,
  Mail,
  Smartphone,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Users,
  Send
} from 'lucide-react'
import Link from 'next/link'

interface ScheduledMessageWithDetails {
  id: string
  subject?: string
  body: string
  channel: string
  recipients: string[]
  scheduledFor: Date
  status: string
  sentAt?: Date
  createdBy: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
  template?: {
    id: string
    name: string
    category: string
  }
  recipientDetails: {
    id: string
    name: string
    email: string
  }[]
}

export default function ScheduledMessagesPage() {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessageWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledMessages()
  }, [])

  const fetchScheduledMessages = async () => {
    try {
      const response = await fetch('/api/messages/scheduled')
      if (response.ok) {
        const data = await response.json()
        setScheduledMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch scheduled messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) {
      return
    }

    try {
      const response = await fetch(`/api/messages/scheduled?id=${messageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'cancelled' }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Failed to cancel message:', error)
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

  const getStatusVariant = (status: string, scheduledFor: Date) => {
    const now = new Date()
    const scheduledTime = new Date(scheduledFor)
    
    switch (status) {
      case 'sent':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'scheduled':
        return scheduledTime <= now ? 'secondary' : 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: string, scheduledFor: Date) => {
    const now = new Date()
    const scheduledTime = new Date(scheduledFor)
    
    if (status === 'cancelled') return 'Cancelled'
    if (status === 'sent') return 'Sent'
    if (status === 'scheduled' && scheduledTime <= now) return 'Pending'
    return 'Scheduled'
  }

  const categorizeMessages = () => {
    const now = new Date()
    
    const upcoming = scheduledMessages.filter(msg => 
      msg.status === 'scheduled' && new Date(msg.scheduledFor) > now
    )
    
    const pending = scheduledMessages.filter(msg => 
      msg.status === 'scheduled' && new Date(msg.scheduledFor) <= now
    )
    
    const sent = scheduledMessages.filter(msg => msg.status === 'sent')
    const cancelled = scheduledMessages.filter(msg => msg.status === 'cancelled')
    
    return { upcoming, pending, sent, cancelled }
  }

  const { upcoming, pending, sent, cancelled } = categorizeMessages()

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  const MessageCard = ({ message }: { message: ScheduledMessageWithDetails }) => (
    <div key={message.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusVariant(message.status, message.scheduledFor)}>
            {getStatusText(message.status, message.scheduledFor)}
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            {getChannelIcon(message.channel)}
            <span>{message.channel}</span>
          </Badge>
          {message.template && (
            <Badge variant="outline">
              {message.template.name}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {message.status === 'scheduled' && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => cancelMessage(message.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        {message.subject && (
          <h4 className="font-medium">{message.subject}</h4>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {message.body.substring(0, 150)}...
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{message.recipients.length} recipients</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(message.scheduledFor).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(message.scheduledFor).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        
        {message.recipientDetails.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Recipients:</p>
            <div className="flex flex-wrap gap-1">
              {message.recipientDetails.slice(0, 3).map(recipient => (
                <Badge key={recipient.id} variant="outline" className="text-xs">
                  {recipient.name}
                </Badge>
              ))}
              {message.recipientDetails.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{message.recipientDetails.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

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
              <h1 className="text-3xl font-bold tracking-tight">Scheduled Messages</h1>
              <p className="text-muted-foreground">
                Manage messages scheduled for future delivery
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild>
              <Link href="/communication/send">
                <Send className="mr-2 h-4 w-4" />
                Schedule New Message
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcoming.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pending.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{sent.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <Trash2 className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{cancelled.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages by Category */}
        <div className="space-y-6">
          {/* Pending Messages */}
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Pending Messages (Ready to Send)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pending.map(message => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Messages */}
          {upcoming.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcoming.map(message => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sent Messages */}
          {sent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sent.slice(0, 5).map(message => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                  {sent.length > 5 && (
                    <div className="text-center">
                      <Button variant="outline" asChild>
                        <Link href="/communication/history">
                          View All Sent Messages
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancelled Messages */}
          {cancelled.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cancelled Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cancelled.slice(0, 5).map(message => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {scheduledMessages.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No scheduled messages</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule messages to be sent at a specific time
                  </p>
                  <Button asChild>
                    <Link href="/communication/send">
                      <Send className="mr-2 h-4 w-4" />
                      Schedule Your First Message
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
