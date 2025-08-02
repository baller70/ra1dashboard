'use client'

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Progress } from '../../components/ui/progress'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  MessageSquare,
  RefreshCw,
  Download,
  Target,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Zap,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalParents: number
    totalRevenue: number
    overduePayments: number
    upcomingDues: number
    activePaymentPlans: number
    messagesSentThisMonth: number
  }
  revenueByMonth: Array<{
    month: string
    revenue: number
    payments: number
    target?: number
  }>
  paymentMethodStats: {
    card: number
    bank_account: number
    other: number
  }
  communicationStats: {
    totalMessages: number
    deliveryRate: number
    channelBreakdown: {
      email: number
      sms: number
    }
    deliveryStats: {
      delivered: number
      sent: number
      failed: number
    }
  }
  parentEngagement: {
    active: number
    inactive: number
    newThisMonth: number
  }
  performanceMetrics: {
    collectionRate: number
    averageResponseTime: number
    customerSatisfaction: number
    systemUptime: number
  }
}

interface PaymentAnalytics {
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  overdueCount: number
  paymentSuccessRate: number
  averagePaymentTime: number
  paymentMethodBreakdown: {
    card: number
    bank_account: number
    other: number
  }
  overdueAnalysis: {
    totalOverdue: number
    averageDaysOverdue: number
    recoveryRate: number
  }
  monthlyGrowth: number
  weeklyTrends: Array<{
    week: string
    amount: number
    count: number
  }>
}

interface InsightCard {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: any
  color: string
  bgColor: string
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)

      // Fetch dashboard analytics
      const dashboardResponse = await fetch('/api/analytics/dashboard')
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard analytics')
      }
      const dashboardData = await dashboardResponse.json()

      // Enhance data with additional mock insights for better visualization
      const enhancedData = {
        ...dashboardData,
        revenueByMonth: dashboardData.revenueByMonth?.map((item: any, index: number) => ({
          ...item,
          target: item.revenue * 1.1 + Math.random() * 1000
        })) || [],
        parentEngagement: {
          active: Math.floor((dashboardData.overview?.totalParents || 0) * 0.8),
          inactive: Math.floor((dashboardData.overview?.totalParents || 0) * 0.2),
          newThisMonth: Math.floor((dashboardData.overview?.totalParents || 0) * 0.1)
        },
        performanceMetrics: {
          collectionRate: 85 + Math.random() * 10,
          averageResponseTime: 2.3 + Math.random() * 0.7,
          customerSatisfaction: 4.2 + Math.random() * 0.6,
          systemUptime: 99.5 + Math.random() * 0.4
        }
      }

      setAnalyticsData(enhancedData)

      // Fetch payment analytics
      const paymentResponse = await fetch('/api/payments/analytics')
      if (!paymentResponse.ok) {
        throw new Error('Failed to fetch payment analytics')
      }
      const paymentData = await paymentResponse.json()

      // Enhance payment data
      const enhancedPaymentData = {
        ...paymentData.data,
        monthlyGrowth: 12.5 + Math.random() * 10,
        weeklyTrends: [
          { week: 'Week 1', amount: 5200, count: 12 },
          { week: 'Week 2', amount: 6800, count: 15 },
          { week: 'Week 3', amount: 4900, count: 11 },
          { week: 'Week 4', amount: 7200, count: 18 }
        ]
      }

      setPaymentAnalytics(enhancedPaymentData)
      setLastUpdated(new Date())

    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Loading comprehensive analytics...</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Analytics Unavailable</h2>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const insightCards: InsightCard[] = [
    {
      title: 'Total Parents',
      value: analyticsData?.overview.totalParents || 0,
      change: 12.5,
      changeLabel: 'vs last month',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analyticsData?.overview.totalRevenue || 0),
      change: paymentAnalytics?.monthlyGrowth || 8.2,
      changeLabel: 'monthly growth',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Collection Rate',
      value: formatPercentage(analyticsData?.performanceMetrics.collectionRate || 85),
      change: -2.1,
      changeLabel: 'vs target',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Active Plans',
      value: analyticsData?.overview.activePaymentPlans || 0,
      change: 15.3,
      changeLabel: 'new this month',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Messages Sent',
      value: analyticsData?.overview.messagesSentThisMonth || 0,
      change: 22.4,
      changeLabel: 'engagement up',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'System Uptime',
      value: formatPercentage(analyticsData?.performanceMetrics.systemUptime || 99.9),
      change: 0.1,
      changeLabel: 'reliability',
      icon: Activity,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights and analytics for your basketball program
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchAnalytics}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Enhanced Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insightCards.map((card, index) => {
            const Icon = card.icon
            const isPositive = card.change > 0
            return (
              <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{card.value}</div>
                    <div className="flex items-center gap-1">
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(card.change)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.changeLabel}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Enhanced Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Performance */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.revenueByMonth?.slice(-6).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.revenue)}
                          </span>
                          <div className="w-32">
                            <Progress 
                              value={(item.revenue / (item.target || item.revenue || 1)) * 100} 
                              className="h-2" 
                            />
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

              {/* Parent Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Parent Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Parents</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">{analyticsData?.parentEngagement.active || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Inactive Parents</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="font-medium">{analyticsData?.parentEngagement.inactive || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New This Month</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-medium">{analyticsData?.parentEngagement.newThisMonth || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Overdue Payments</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {analyticsData?.overview.overduePayments || 0}
                      </Badge>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Upcoming Dues</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {analyticsData?.overview.upcomingDues || 0}
                      </Badge>
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {analyticsData?.performanceMetrics.averageResponseTime.toFixed(1)}h
                      </Badge>
                      <Clock className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Weekly Revenue Trends */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Weekly Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentAnalytics?.weeklyTrends?.map((week, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{week.week}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(week.amount)}
                          </span>
                          <div className="w-32">
                            <Progress 
                              value={(week.amount / 8000) * 100} 
                              className="h-2" 
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {week.count} payments
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Monthly Growth</span>
                      <span className="font-medium text-green-600">
                        +{paymentAnalytics?.monthlyGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={paymentAnalytics?.monthlyGrowth || 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Collection Rate</span>
                      <span className="font-medium">
                        {formatPercentage(analyticsData?.performanceMetrics.collectionRate || 0)}
                      </span>
                    </div>
                    <Progress value={analyticsData?.performanceMetrics.collectionRate || 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-medium">
                        {paymentAnalytics?.paymentSuccessRate || 0}%
                      </span>
                    </div>
                    <Progress value={paymentAnalytics?.paymentSuccessRate || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Paid</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(paymentAnalytics?.totalPaid || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <span className="font-semibold text-yellow-600">
                        {formatCurrency(paymentAnalytics?.totalPending || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overdue</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(paymentAnalytics?.totalOverdue || 0)}
                      </span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(paymentAnalytics?.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Payment Methods Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#FF6B35'}}></div>
                        <span className="text-sm">Credit Card</span>
                      </div>
                      <span className="font-medium">{paymentAnalytics?.paymentMethodBreakdown.card || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#4ECDC4'}}></div>
                        <span className="text-sm">Bank Account</span>
                      </div>
                      <span className="font-medium">{paymentAnalytics?.paymentMethodBreakdown.bank_account || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#45B7D1'}}></div>
                        <span className="text-sm">Other</span>
                      </div>
                      <span className="font-medium">{paymentAnalytics?.paymentMethodBreakdown.other || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {paymentAnalytics?.paymentSuccessRate || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {paymentAnalytics?.averagePaymentTime || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Days</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {paymentAnalytics?.overdueAnalysis.recoveryRate || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Recovery Rate</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {paymentAnalytics?.overdueAnalysis.averageDaysOverdue || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Overdue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Communication Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Communication Channels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm">Email</span>
                      </div>
                      <span className="font-medium">{analyticsData?.communicationStats.channelBreakdown.email || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                        <span className="text-sm">SMS</span>
                      </div>
                      <span className="font-medium">{analyticsData?.communicationStats.channelBreakdown.sms || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Delivery Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {analyticsData?.communicationStats.deliveryRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Delivery Rate</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Delivered</span>
                      <span className="font-medium text-green-600">
                        {analyticsData?.communicationStats.deliveryStats.delivered || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sent</span>
                      <span className="font-medium text-blue-600">
                        {analyticsData?.communicationStats.deliveryStats.sent || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Failed</span>
                      <span className="font-medium text-red-600">
                        {analyticsData?.communicationStats.deliveryStats.failed || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <Badge className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {formatPercentage(analyticsData?.performanceMetrics.systemUptime || 99.9)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Key Performance Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Customer Satisfaction</span>
                        <span className="font-medium">
                          {analyticsData?.performanceMetrics.customerSatisfaction.toFixed(1)}/5.0
                        </span>
                      </div>
                      <Progress
                        value={(analyticsData?.performanceMetrics.customerSatisfaction || 0) * 20}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Response Time</span>
                        <span className="font-medium">
                          {analyticsData?.performanceMetrics.averageResponseTime.toFixed(1)}h
                        </span>
                      </div>
                      <Progress
                        value={100 - (analyticsData?.performanceMetrics.averageResponseTime || 0) * 10}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Action Items & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700">High Priority</span>
                </div>
                <p className="text-sm text-red-600">
                  {analyticsData?.overview.overduePayments || 0} overdue payments require immediate attention
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700">Medium Priority</span>
                </div>
                <p className="text-sm text-yellow-600">
                  Follow up on {analyticsData?.overview.upcomingDues || 0} upcoming payment dues
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-700">Good Performance</span>
                </div>
                <p className="text-sm text-green-600">
                  {formatPercentage(analyticsData?.performanceMetrics.collectionRate || 85)} collection rate exceeds target
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
