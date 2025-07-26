
// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Separator } from '../../../components/ui/separator'
import { 
  Plus, 
  Search, 
  Play,
  Pause,
  Edit,
  Eye,
  Trash2,
  Calendar,
  Users,
  Mail,
  Clock,
  TrendingUp,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { RecurringMessageWithRelations } from '../../../lib/types'

export default function RecurringMessagesPage() {
  const [recurringMessages, setRecurringMessages] = useState<RecurringMessageWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchRecurringMessages()
  }, [])

  const fetchRecurringMessages = async () => {
    try {
      const response = await fetch('/api/recurring-messages')
      if (response.ok) {
        const data = await response.json()
        setRecurringMessages(data.recurringMessages)
      }
    } catch (error) {
      console.error('Failed to fetch recurring messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = recurringMessages.filter(message => {
    const matchesSearch = message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.body.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    if (statusFilter === 'active') {
      matchesStatus = message.isActive && !message.pausedAt
    } else if (statusFilter === 'paused') {
      matchesStatus = message.pausedAt !== null
    } else if (statusFilter === 'inactive') {
      matchesStatus = !message.isActive
    }
    
    return matchesSearch && matchesStatus
  })

  const handlePause = async (messageId: string) => {
    setActionLoading(messageId)
    try {
      const response = await fetch(`/api/recurring-messages/${messageId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Paused by user'
        })
      })

      if (response.ok) {
        fetchRecurringMessages()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to pause message')
      }
    } catch (error) {
      console.error('Pause error:', error)
      alert('Failed to pause message')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (messageId: string) => {
    setActionLoading(messageId)
    try {
      const response = await fetch(`/api/recurring-messages/${messageId}/resume`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchRecurringMessages()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to resume message')
      }
    } catch (error) {
      console.error('Resume error:', error)
      alert('Failed to resume message')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (message: RecurringMessageWithRelations) => {
    if (!message.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    } else if (message.pausedAt) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Paused</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
    }
  }

  const getIntervalDisplay = (message: RecurringMessageWithRelations) => {
    const { interval, intervalValue } = message
    if (interval === 'custom') {
      return 'Custom'
    }
    const unit = intervalValue === 1 ? interval.slice(0, -2) : interval.slice(0, -2) + 's'
    return `Every ${intervalValue} ${unit}`
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'both':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
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
            <h1 className="text-3xl font-bold tracking-tight">Recurring Messages</h1>
            <p className="text-muted-foreground">
              Automate your communication with smart recurring message campaigns
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1">
              <RefreshCw className="mr-1 h-3 w-3" />
              Automated
            </Badge>
            <Button asChild>
              <Link href="/communication/recurring/new">
                <Plus className="mr-2 h-4 w-4" />
                New Recurring Message
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
                    placeholder="Search recurring messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Messages Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMessages.map((message) => (
            <Card key={message.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getChannelIcon(message.channel)}
                      <CardTitle className="text-lg font-semibold truncate">
                        {message?.name ?? 'Untitled'}
                      </CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(message)}
                      <Badge variant="outline" className="text-xs">
                        {message.targetAudience}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {message.isActive && !message.pausedAt ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePause(message.id)}
                        disabled={actionLoading === message.id}
                        className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700"
                      >
                        {actionLoading === message.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                    ) : message.pausedAt ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResume(message.id)}
                        disabled={actionLoading === message.id}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      >
                        {actionLoading === message.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    ) : null}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Message Preview */}
                <div>
                  {message.subject && (
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Subject: {message.subject}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {message?.body ?? ''}
                  </p>
                </div>

                <Separator />

                {/* Schedule Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Schedule:</span>
                    </div>
                    <span className="font-medium">{getIntervalDisplay(message)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Recipients:</span>
                    </div>
                    <span className="font-medium">{message.recipients?.length || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Started:</span>
                    </div>
                    <span className="font-medium">{new Date(message.startDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <Separator />

                {/* Performance Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      <span>Instances:</span>
                    </div>
                    <span className="font-medium">{message.instances?.length || 0}</span>
                  </div>

                  {message.instances && message.instances.length > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium text-green-600">
                          {message.instances.length > 0 
                            ? Math.round((message.instances.reduce((sum, inst) => sum + inst.successCount, 0) / 
                                message.instances.reduce((sum, inst) => sum + inst.recipientCount, 0)) * 100)
                            : 0
                          }%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Sent:</span>
                        <span className="font-medium">
                          {message.instances.reduce((sum, inst) => sum + inst.successCount, 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Stop Conditions */}
                {message.stopConditions && (() => {
                  try {
                    const conditions = JSON.parse(message.stopConditions) as string[]
                    return conditions.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Stop Conditions:</h4>
                        <div className="flex flex-wrap gap-1">
                          {conditions.map((condition, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {condition.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null
                  } catch {
                    return null
                  }
                })()}

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/communication/recurring/${message.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/communication/recurring/${message.id}/edit`}>
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/communication/recurring/${message.id}/analytics`}>
                        <TrendingUp className="h-3 w-3" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recurring messages found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first recurring message to automate communication'
                }
              </p>
              <Button asChild>
                <Link href="/communication/recurring/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Recurring Message
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
