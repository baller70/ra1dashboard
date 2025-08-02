'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft,
  Search,
  Mail,
  Smartphone,
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface MessageLog {
  id: string
  subject?: string
  body: string
  channel: string
  status: string
  sentAt: string
  deliveredAt?: string
  readAt?: string
  parent: {
    name: string
    email: string
  }
  template?: {
    name: string
    category: string
  }
  metadata?: {
    draftId?: string
    webUrl?: string
  }
}

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchMessages()
  }, [channelFilter, statusFilter])

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams()
      if (channelFilter !== 'all') params.append('channel', channelFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/communication/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch message history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (message.subject && message.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <Smartphone className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'draft_created':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-orange-600" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'default'
      case 'draft_created':
        return 'secondary'
      case 'failed':
        return 'destructive'
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
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/communication">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communication
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Message History</h1>
              <p className="text-muted-foreground">
                View all sent and drafted messages
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by parent name, email, or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="draft_created">Draft Created</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(message.status)} className="flex items-center space-x-1">
                          {getStatusIcon(message.status)}
                          <span className="capitalize">{message.status.replace('_', ' ')}</span>
                        </Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          {getChannelIcon(message.channel)}
                          <span className="capitalize">{message.channel}</span>
                        </Badge>
                        {message.template && (
                          <Badge variant="outline" className="text-xs">
                            {message.template.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{message.parent.name}</span>
                          <span className="text-muted-foreground">({message.parent.email})</span>
                        </div>
                        {message.subject && (
                          <p className="font-medium text-sm mt-1">{message.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {message.body.substring(0, 150)}...
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Sent: {new Date(message.sentAt).toLocaleString()}</span>
                        </div>
                        {message.deliveredAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Delivered: {new Date(message.deliveredAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {message.metadata?.webUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a href={message.metadata.webUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
                  <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || channelFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'Start sending messages to see them here'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/communication/send">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Your First Message
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
