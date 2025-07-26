// @ts-nocheck
'use client'

import { AppLayout } from '@/components/app-layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, Users, DollarSign, BarChart3, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface DashboardStatsExtended {
  totalParents: number
  totalPayments: number
  totalRevenue: number
  overduePayments: number
  upcomingDues: number
  activePaymentPlans: number
  messagesSentThisMonth: number
  recentActivity: any[]
}

interface PaymentTrend {
  month: string
  revenue: number
  payments: number
}

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsExtended>({
    totalParents: 0,
    totalPayments: 0,
    totalRevenue: 0,
    overduePayments: 0,
    upcomingDues: 0,
    activePaymentPlans: 0,
    messagesSentThisMonth: 0,
    recentActivity: []
  })
  const [revenueTrends, setRevenueTrends] = useState<PaymentTrend[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all dashboard data in parallel
      const [statsRes, trendsRes, activityRes] = await Promise.all([
        fetch('/api/dashboard/stats', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch('/api/dashboard/revenue-trends', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch('/api/dashboard/recent-activity', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        const rawStats = statsData.data || statsData
        // Map the API response to our extended interface
        setStats({
          totalParents: rawStats.totalParents || 0,
          totalPayments: rawStats.totalPayments || 0,
          totalRevenue: rawStats.totalRevenue || 0,
          overduePayments: rawStats.overduePayments || 0,
          upcomingDues: rawStats.upcomingDues || 0,
          activePaymentPlans: rawStats.activePaymentPlans || 0,
          messagesSentThisMonth: rawStats.messagesSentThisMonth || 0,
          recentActivity: []
        })
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json()
        setRevenueTrends(trendsData || [])
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setRecentActivity(activityData.data?.activities || activityData.activities || [])
      }

    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    toast({
      title: "Refreshing Dashboard",
      description: "Updating all dashboard data...",
      duration: 2000,
    })
    await fetchDashboardData()
    toast({
      title: "Dashboard Updated",
      description: "All data has been refreshed successfully.",
      duration: 3000,
    })
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <StatsCards stats={stats} />
        
        {/* Charts and Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <RevenueChart data={revenueTrends} />
          <RecentActivity activities={recentActivity} />
        </div>
        
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used actions and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Link href="/parents">
                <Button variant="outline" className="h-20 flex flex-col w-full hover:bg-accent">
                  <Users className="h-6 w-6 mb-2" />
                  Add Parent
                </Button>
              </Link>
              <Link href="/payments">
                <Button variant="outline" className="h-20 flex flex-col w-full hover:bg-accent">
                  <DollarSign className="h-6 w-6 mb-2" />
                  Record Payment
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="h-20 flex flex-col w-full hover:bg-accent">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/communication/send">
                <Button variant="outline" className="h-20 flex flex-col w-full hover:bg-accent">
                  <MessageSquare className="h-6 w-6 mb-2" />
                  Send Reminders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </AppLayout>
  )
}
