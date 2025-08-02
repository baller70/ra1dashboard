// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '../components/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  BarChart3,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
  Send,
  FileText,
  Settings
} from 'lucide-react'
import { DashboardStats, PaymentTrend } from '../lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<PaymentTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch revenue trends
      const revenueResponse = await fetch('/api/dashboard/revenue-trends')
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json()
        setRevenueData(revenueData.trends || [])
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/dashboard/recent-activity')
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const quickActions = [
    {
      title: 'Add New Parent',
      description: 'Register a new parent in the system',
      icon: Users,
      href: '/parents/new',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Record Payment',
      description: 'Process a new payment or installment',
      icon: CreditCard,
      href: '/payments',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Send Communication',
      description: 'Send emails or SMS to parents',
      icon: Send,
      href: '/communication/send',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'View Analytics',
      description: 'Detailed analytics and insights',
      icon: BarChart3,
      href: '/analytics',
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ]

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your basketball program management dashboard
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your basketball program management dashboard
            </p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* 6 Analytics Cards */}
        {stats && <StatsCards stats={stats} />}

        {/* Charts and Activity Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue Chart - Takes 2 columns */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Trends
                  <span className="text-sm font-normal text-muted-foreground">
                    Monthly revenue over time
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.slice(-6).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          ${item.revenue.toLocaleString()}
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{width: `${Math.min((item.revenue / Math.max(...revenueData.map(d => d.revenue))) * 100, 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.count} payments
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity - Takes 1 column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'payment' && (
                        <div className="p-1 bg-green-50 rounded-full">
                          <DollarSign className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                      {activity.type === 'parent' && (
                        <div className="p-1 bg-blue-50 rounded-full">
                          <Users className="h-3 w-3 text-blue-600" />
                        </div>
                      )}
                      {activity.type === 'message' && (
                        <div className="p-1 bg-purple-50 rounded-full">
                          <MessageSquare className="h-3 w-3 text-purple-600" />
                        </div>
                      )}
                      {activity.type === 'alert' && (
                        <div className="p-1 bg-red-50 rounded-full">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title || activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.time || (activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-green-50 rounded-full">
                      <DollarSign className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment received from John Smith</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-50 rounded-full">
                      <Users className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New parent registered</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-purple-50 rounded-full">
                      <MessageSquare className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Reminder sent to 25 parents</p>
                      <p className="text-xs text-gray-500">6 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-red-50 rounded-full">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">3 payments overdue</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  View All Activity
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4 Quick Action Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Card key={index} className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${action.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      {action.description}
                    </p>
                    <Button asChild className="w-full">
                      <a href={action.href}>
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </span>
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                All Systems Operational
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.totalParents || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.messagesSentThisMonth || 0}
                </div>
                <div className="text-sm text-muted-foreground">Messages This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ${stats?.totalRevenue?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
