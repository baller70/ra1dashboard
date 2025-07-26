
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import Link from 'next/link'
import { 
  DollarSign, 
  MessageSquare, 
  UserPlus, 
  FileText, 
  Mail,
  User,
  Clock,
  ExternalLink
} from 'lucide-react'
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
}

interface RecentActivityProps {
  activities: ActivityNotification[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: string, iconName?: string) => {
    if (iconName) {
      switch (iconName) {
        case 'DollarSign':
          return <DollarSign className="h-4 w-4" />
        case 'MessageSquare':
          return <MessageSquare className="h-4 w-4" />
        case 'Mail':
          return <Mail className="h-4 w-4" />
        case 'User':
          return <User className="h-4 w-4" />
        case 'FileText':
          return <FileText className="h-4 w-4" />
        default:
          return <FileText className="h-4 w-4" />
      }
    }

    // Fallback to type-based icons
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4" />
      case 'reminder':
        return <MessageSquare className="h-4 w-4" />
      case 'parent_update':
        return <UserPlus className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-blue-600 bg-blue-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Recent Activity
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.length > 0 ? (
            activities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className={`flex-shrink-0 p-2 rounded-md ${getPriorityColor(activity.priority)}`}>
                  {getIcon(activity.type, activity.icon)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <Badge variant={getBadgeVariant(activity.priority)} className="text-xs">
                      {activity.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.message}
                  </p>
                  {activity.parentName && (
                    <p className="text-xs text-muted-foreground">
                      Parent: {activity.parentName}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                    {activity.actionUrl && activity.actionText && (
                      <Link href={activity.actionUrl}>
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          {activity.actionText}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-xs mt-1">Activity will appear here as actions are performed</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
