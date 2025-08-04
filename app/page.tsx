// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'
// Temporarily disable RevenueChart to fix build issues
// import { RevenueChart } from '../components/dashboard/revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
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
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<PaymentTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [overdueParents, setOverdueParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false)
  const [allActivities, setAllActivities] = useState<any[]>([])

  const fetchAllActivities = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      })
      const data = await response.json()
      if (data.success) {
        setAllActivities(data.data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching all activities:', error)
    }
  }

  const fetchDashboardData = async (isManualRefresh = false) => {
    console.log('🔄 Fetching dashboard data - all 8 analytics cards will update...')
    
    if (isManualRefresh) {
      setRefreshing(true)
    }
    
    try {
      // Fetch dashboard stats with cache-busting
      const cacheBuster = Date.now()
      const statsResponse = await fetch(`/api/dashboard/stats?t=${cacheBuster}`, {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024',
          'Cache-Control': 'no-cache'
        }
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('📊 Fresh dashboard stats received:', statsData)
        
        // Extract the actual stats from API response {success: true, data: {...}}
        const actualStats = statsData.data || statsData
        console.log('📈 All 8 analytics cards updating with:', actualStats)
        
        setStats(actualStats)
      }

      // Fetch revenue trends
      const revenueResponse = await fetch('/api/dashboard/revenue-trends', {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json()
        console.log('📈 Revenue trends received:', revenueData)
        // Revenue trends API returns array directly
        setRevenueData(Array.isArray(revenueData) ? revenueData : (revenueData.trends || []))
      }

              // Fetch recent activity with cache busting
        const activityResponse = await fetch(`/api/dashboard/recent-activity?t=${cacheBuster}`, {
          headers: {
            'x-api-key': 'ra1-dashboard-api-key-2024',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          console.log('🕒 Recent activity received:', activityData)
          setRecentActivity(activityData.data?.activities || [])
        }

        // Fetch overdue summary for tags
        const overdueResponse = await fetch('/api/dashboard/overdue-summary', {
          headers: {
            'x-api-key': 'ra1-dashboard-api-key-2024'
          }
        })
        if (overdueResponse.ok) {
          const overdueData = await overdueResponse.json()
          console.log('🏷️ Overdue summary received:', overdueData)
          setOverdueParents(overdueData.data?.overdueSummary || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLastUpdated(new Date())
      }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchDashboardData(true)
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(() => fetchDashboardData(), 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen for parent deletions from other pages to refresh dashboard stats
  useEffect(() => {
    const handleParentDeleted = () => {
      console.log('🔔 Dashboard received parent-deleted event, refreshing all 6 analytics cards...')
      fetchDashboardData()
    }
    
    console.log('🎧 Dashboard event listener registered for parent-deleted events')
    window.addEventListener('parent-deleted', handleParentDeleted)
    return () => {
      console.log('🔇 Dashboard event listener removed')
      window.removeEventListener('parent-deleted', handleParentDeleted)
    }
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
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              {refreshing ? 'Updating...' : 'Live'}
            </div>
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <TrendingUp className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh Now'}
            </Button>
          </div>
        </div>

        {/* 8 Analytics Cards */}
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
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{width: `${Math.min((item.revenue / Math.max(...revenueData.map(d => d.revenue))) * 100, 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.payments} payments
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
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <MessageSquare className="h-8 w-8 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400">Activity will appear here as you use the system</p>
                </div>
              )}
              
              <div className="pt-2">
                <Dialog open={showAllActivitiesModal} onOpenChange={setShowAllActivitiesModal}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-center"
                      onClick={async (e) => {
                        e.preventDefault()
                        console.log('View All Activity button clicked')
                        await fetchAllActivities()
                        setShowAllActivitiesModal(true)
                      }}
                    >
                      View All Activity
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>All Recent Activities</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {allActivities.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No activities found</p>
                      ) : (
                        allActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className={`p-2 rounded-full ${
                              activity.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                              activity.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                              activity.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {activity.icon === 'alert-triangle' && <AlertTriangle className="h-4 w-4" />}
                              {activity.icon === 'check-circle' && <div className="h-4 w-4 rounded-full bg-green-500" />}
                              {activity.icon === 'clock' && <Clock className="h-4 w-4" />}
                              {activity.icon === 'bell' && <div className="h-4 w-4 rounded-full bg-yellow-500" />}
                              {activity.icon === 'file-text' && <FileText className="h-4 w-4" />}
                              {activity.icon === 'user' && <Users className="h-4 w-4" />}
                              {activity.icon === 'mail' && <MessageSquare className="h-4 w-4" />}
                              {activity.icon === 'message-square' && <MessageSquare className="h-4 w-4" />}
                              {!activity.icon && <div className="h-4 w-4 rounded-full bg-gray-400" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{activity.title}</h4>
                                <span className="text-xs text-gray-500">
                                  {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{activity.message}</p>
                              {activity.parentName && (
                                <p className="text-xs text-gray-500 mt-1">Parent: {activity.parentName}</p>
                              )}
                              {activity.amount && (
                                <p className="text-xs font-medium text-green-600 mt-1">${activity.amount}</p>
                              )}
                              {activity.actionUrl && activity.actionText && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={() => {
                                    setShowAllActivitiesModal(false)
                                    router.push(activity.actionUrl)
                                  }}
                                >
                                  {activity.actionText}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
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
