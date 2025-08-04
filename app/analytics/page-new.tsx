'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Progress } from '../../components/ui/progress'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
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
  ArrowDownRight,
  TrendingUpIcon,
  Mail,
  Smartphone,
  Eye,
  MousePointer,
  Reply
} from 'lucide-react'

interface ComprehensiveAnalytics {
  overview: {
    totalParents: number
    activeParents: number
    newParentsThisPeriod: number
    totalRevenue: number
    totalRevenuePaid: number
    pendingRevenue: number
    overduePayments: number
    overdueRevenue: number
    activePaymentPlans: number
    messagesSentThisPeriod: number
    paymentSuccessRate: number
    averagePaymentTime: number
  }
  revenue: {
    monthlyTrends: Array<{
      month: string
      revenue: number
      payments: number
      target?: number
    }>
    weeklyTrends: Array<{
      week: string
      amount: number
      count: number
    }>
    totalCommitted: number
    totalPaid: number
    totalPending: number
    totalOverdue: number
    monthlyGrowth: number
  }
  payments: {
    totalInstallments: number
    paidInstallments: number
    overdueInstallments: number
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
  }
  communication: {
    messageStats: {
      total: number
      sent: number
      delivered: number
      failed: number
      byChannel: {
        email: number
        sms: number
      }
      byType: {
        payment_reminder: number
        contract_followup: number
        general: number
      }
    }
    deliveryRate: number
    engagementStats: {
      totalSent: number
      opened: number
      clicked: number
      replied: number
      openRate: number
      clickRate: number
      replyRate: number
    }
    channelBreakdown: {
      email: number
      sms: number
    }
    typeBreakdown: {
      payment_reminder: number
      contract_followup: number
      general: number
    }
  }
  performance: {
    collectionRate: number
    averageResponseTime: number
    customerSatisfaction: number
    systemUptime: number
  }
  meta: {
    dateRange: string
    startDate: number
    endDate: number
    lastUpdated: number
    dataPoints: {
      parents: number
      payments: number
      installments: number
      messages: number
    }
  }
}

export default function ComprehensiveAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<ComprehensiveAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('month')
  const [activeTab, setActiveTab] = useState('overview')

  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)

      console.log('🔄 Fetching comprehensive analytics...')
      
      const response = await fetch(`/api/analytics/comprehensive?dateRange=${dateRange}&t=${Date.now()}`, {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      console.log('📊 Analytics data received:', {
        totalParents: result.data.overview.totalParents,
        totalRevenue: result.data.overview.totalRevenue,
        dataPoints: result.data.meta.dataPoints
      })

      setAnalyticsData(result.data)

    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh every 2 minutes for live updates
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 2 * 60 * 1000)
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Loading comprehensive analytics...</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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

  if (!analyticsData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-muted-foreground mb-4">No analytics data found</p>
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const { overview, revenue, payments, communication, performance, meta } = analyticsData

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time insights from your basketball program database
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Last updated: {new Date(meta.lastUpdated).toLocaleTimeString()}</span>
              <span>•</span>
              <span>Data points: {formatNumber(meta.dataPoints.parents)} parents, {formatNumber(meta.dataPoints.installments)} installments</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              {refreshing ? 'Updating...' : 'Live'}
            </div>
            <Button
              onClick={fetchAnalytics}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Parents */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Parents
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatNumber(overview.totalParents)}</div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    +{overview.newParentsThisPeriod}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overview.activeParents} active ({formatPercentage((overview.activeParents / overview.totalParents) * 100)})
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</div>
                <div className="flex items-center gap-1">
                  {revenue.monthlyGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${revenue.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(revenue.monthlyGrowth)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(overview.totalRevenuePaid)} collected
              </p>
            </CardContent>
          </Card>

          {/* Payment Success Rate */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payment Success Rate
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-50">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatPercentage(overview.paymentSuccessRate)}</div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    On-time
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.paidInstallments}/{payments.totalInstallments} installments
              </p>
            </CardContent>
          </Card>

          {/* Overdue Payments */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue Payments
              </CardTitle>
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{overview.overduePayments}</div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">
                    {formatCurrency(overview.overdueRevenue)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {payments.overdueAnalysis.averageDaysOverdue} days overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
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
              {/* Revenue Trends */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5" />
                    Revenue Trends (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenue.monthlyTrends.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.revenue)}
                          </span>
                          <div className="w-32">
                            <Progress 
                              value={Math.min(100, (item.revenue / Math.max(...revenue.monthlyTrends.map(t => t.revenue))) * 100)} 
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

              {/* Collection Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Collection Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Collection Rate</span>
                      <span className="font-medium text-green-600">
                        {formatPercentage(performance.collectionRate)}
                      </span>
                    </div>
                    <Progress value={performance.collectionRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Success</span>
                      <span className="font-medium">
                        {formatPercentage(overview.paymentSuccessRate)}
                      </span>
                    </div>
                    <Progress value={overview.paymentSuccessRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recovery Rate</span>
                      <span className="font-medium">
                        {formatPercentage(payments.overdueAnalysis.recoveryRate)}
                      </span>
                    </div>
                    <Progress value={payments.overdueAnalysis.recoveryRate} className="h-2" />
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
                      <span className="text-sm">Collected</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(revenue.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <span className="font-semibold text-yellow-600">
                        {formatCurrency(revenue.totalPending)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overdue</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(revenue.totalOverdue)}
                      </span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Committed</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(revenue.totalCommitted)}
                      </span>
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
                    <BarChart3 className="h-5 w-5" />
                    Weekly Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenue.weeklyTrends.map((week, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{week.week}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(week.amount)}
                          </span>
                          <div className="w-32">
                            <Progress 
                              value={Math.min(100, (week.amount / Math.max(...revenue.weeklyTrends.map(w => w.amount))) * 100)} 
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

              {/* Revenue Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {revenue.monthlyGrowth >= 0 ? '+' : ''}{revenue.monthlyGrowth}%
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Growth</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenue.totalPaid / (revenue.monthlyTrends.length || 1))}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Monthly Revenue</div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Plan Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Plan Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Plans</span>
                      <span className="font-semibold">{overview.activePaymentPlans}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Installments</span>
                      <span className="font-semibold">{payments.totalInstallments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Paid Installments</span>
                      <span className="font-semibold text-green-600">{payments.paidInstallments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overdue Installments</span>
                      <span className="font-semibold text-red-600">{payments.overdueInstallments}</span>
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
                    <CreditCard className="h-5 w-5" />
                    Payment Methods Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Credit Card</span>
                      </div>
                      <span className="font-medium">{payments.paymentMethodBreakdown.card}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Bank Account</span>
                      </div>
                      <span className="font-medium">{payments.paymentMethodBreakdown.bank_account}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-sm">Other</span>
                      </div>
                      <span className="font-medium">{payments.paymentMethodBreakdown.other}%</span>
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
                        {formatPercentage(payments.paymentSuccessRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {payments.averagePaymentTime.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Days Early</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatPercentage(payments.overdueAnalysis.recoveryRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">Recovery Rate</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {payments.overdueAnalysis.averageDaysOverdue}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Days Overdue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Message Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Email</span>
                      </div>
                      <span className="font-medium">{communication.channelBreakdown.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-green-500" />
                        <span className="text-sm">SMS</span>
                      </div>
                      <span className="font-medium">{communication.channelBreakdown.sms}</span>
                    </div>
                    <hr />
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Sent</span>
                      <span className="font-semibold">{communication.messageStats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Delivered</span>
                      <span className="font-semibold text-green-600">{communication.messageStats.delivered}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Failed</span>
                      <span className="font-semibold text-red-600">{communication.messageStats.failed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Engagement Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {formatPercentage(communication.deliveryRate)}
                      </div>
                      <div className="text-sm text-muted-foreground">Delivery Rate</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">{formatPercentage(communication.engagementStats.openRate)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Open</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <div className="flex items-center justify-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          <span className="text-xs">{formatPercentage(communication.engagementStats.clickRate)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Click</div>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <div className="flex items-center justify-center gap-1">
                          <Reply className="h-3 w-3" />
                          <span className="text-xs">{formatPercentage(communication.engagementStats.replyRate)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Reply</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Message Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Payment Reminders</span>
                      <span className="font-semibold">{communication.typeBreakdown.payment_reminder}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Contract Follow-ups</span>
                      <span className="font-semibold">{communication.typeBreakdown.contract_followup}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">General Messages</span>
                      <span className="font-semibold">{communication.typeBreakdown.general}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Delivery Rate</span>
                      <span className="font-medium text-green-600">
                        {formatPercentage(communication.deliveryRate)}
                      </span>
                    </div>
                    <Progress value={communication.deliveryRate} className="h-2" />
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
                    <span className="text-sm">Database</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <Badge className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {formatPercentage(performance.systemUptime)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Key Performance Indicators */}
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
                        <span>Collection Rate</span>
                        <span className="font-medium">
                          {formatPercentage(performance.collectionRate)}
                        </span>
                      </div>
                      <Progress value={performance.collectionRate} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Customer Satisfaction</span>
                        <span className="font-medium">
                          {performance.customerSatisfaction.toFixed(1)}/5.0
                        </span>
                      </div>
                      <Progress
                        value={performance.customerSatisfaction * 20}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Response Time</span>
                        <span className="font-medium">
                          {performance.averageResponseTime.toFixed(1)}h
                        </span>
                      </div>
                      <Progress
                        value={Math.max(0, 100 - performance.averageResponseTime * 10)}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Data Quality Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Data Summary & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700">Data Quality</span>
                </div>
                <p className="text-sm text-blue-600">
                  Analytics based on {formatNumber(meta.dataPoints.parents)} parents, {formatNumber(meta.dataPoints.installments)} installments, 
                  and {formatNumber(meta.dataPoints.messages)} messages
                </p>
              </div>
              
              {overview.overduePayments > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700">Action Required</span>
                  </div>
                  <p className="text-sm text-red-600">
                    {overview.overduePayments} parents have overdue payments totaling {formatCurrency(overview.overdueRevenue)}
                  </p>
                </div>
              )}
              
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-700">Performance</span>
                </div>
                <p className="text-sm text-green-600">
                  {formatPercentage(performance.collectionRate)} collection rate with {formatPercentage(overview.paymentSuccessRate)} on-time payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}