'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Settings, 
  X,
  CheckCircle,
  Mail,
  MessageSquare,
  User,
  AlertCircle
} from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'
import { ScrollArea } from './scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from './dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

interface ActivityNotification {
  id: string
  type: 'payment' | 'reminder' | 'system' | 'contract' | 'parent_update'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: number
  isRead: boolean
  actionUrl?: string
  actionText?: string
  parentName?: string
  amount?: number
  icon?: string
  metadata?: any
}

interface NotificationCounts {
  total: number
  unread: number
  urgent: number
  high: number
  byType: {
    payment: number
    reminder: number
    contract: number
    system: number
    parent_update: number
  }
}

interface NotificationDropdownProps {
  userId?: string
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityNotification[]>([])
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unread: 0,
    urgent: 0,
    high: 0,
    byType: {
      payment: 0,
      reminder: 0,
      contract: 0,
      system: 0,
      parent_update: 0
    }
  })
  const [loading, setLoading] = useState(true)

  // Fetch activities from the new API
  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      
      if (response.ok) {
        const data = await response.json()
        setActivities(data.data.activities || [])
        setCounts(data.data.counts || counts)
      } else {
        console.error('Failed to fetch activities:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
    
    // Refresh activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchActivities()
    }
  }, [isOpen])

  const handleMarkAsRead = async (activityId: string) => {
    // Update local state immediately for better UX
    setActivities(prev => prev.map(activity => 
      activity.id === activityId ? { ...activity, isRead: true } : activity
    ))
    
    // Update counts
    setCounts(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1)
    }))
  }

  const handleMarkAllAsRead = async () => {
    // Update local state immediately
    setActivities(prev => prev.map(activity => ({ ...activity, isRead: true })))
    setCounts(prev => ({
      ...prev,
      unread: 0,
      urgent: 0,
      high: 0,
      byType: {
        payment: 0,
        reminder: 0,
        contract: 0,
        system: 0,
        parent_update: 0
      }
    }))
  }

  const handleDeleteNotification = async (activityId: string) => {
    // Remove from local state immediately
    const activityToRemove = activities.find(a => a.id === activityId)
    setActivities(prev => prev.filter(activity => activity.id !== activityId))
    
    if (activityToRemove && !activityToRemove.isRead) {
      setCounts(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        unread: Math.max(0, prev.unread - 1)
      }))
    }
  }

  const getNotificationIcon = (activity: ActivityNotification) => {
    const iconName = activity.icon || activity.type
    
    switch (iconName) {
      case 'alert-triangle':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'check-circle':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'clock':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'bell':
        return <Bell className="h-4 w-4 text-blue-500" />
      case 'mail':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'message-square':
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'file-text':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'user':
        return <User className="h-4 w-4 text-gray-500" />
      case 'alert-circle':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />
      case 'contract':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'system':
        return <Settings className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-blue-500'
      case 'low':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const unreadCount = counts.unread

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="font-semibold">
            Latest Activities
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-6 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2 animate-pulse" />
              <p className="text-sm font-medium text-muted-foreground">Loading activities...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-1">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer group transition-colors ${
                    !activity.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Priority indicator */}
                  <div className={`w-1 h-12 rounded-full ${getPriorityColor(activity.priority)}`} />
                  
                  {/* Notification icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(activity)}
                  </div>
                  
                  {/* Notification content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm leading-tight ${!activity.isRead ? 'font-medium' : 'font-normal'}`}>
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.message}
                        </p>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                          {activity.parentName && (
                            <Badge variant="outline" className="text-xs">
                              {activity.parentName}
                            </Badge>
                          )}
                          {activity.amount && (
                            <Badge variant="secondary" className="text-xs">
                              ${activity.amount}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action button */}
                        {activity.actionUrl && activity.actionText && (
                          <div className="mt-2">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                handleMarkAsRead(activity.id)
                                setIsOpen(false)
                              }}
                            >
                              <Link href={activity.actionUrl}>
                                {activity.actionText}
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!activity.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(activity.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(activity.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No recent activities</p>
              <p className="text-xs text-muted-foreground">All caught up!</p>
            </div>
          )}
        </ScrollArea>
        
        {activities.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                asChild
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => setIsOpen(false)}
              >
                <Link href="/notifications">
                  View All Activities
                </Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 