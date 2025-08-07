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
// Badge import removed (System Status section deleted)
// Dialog imports removed (Recent Activity modal deleted)
import { 
  TrendingUp
} from 'lucide-react'
import { DashboardStats, PaymentTrend } from '../lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // fetchAllActivities function removed (Recent Activity section deleted)

  const fetchDashboardData = async (isManualRefresh = false) => {
    console.log('🔄 Fetching dashboard data - ONLY 3 cards will update...')
    
    if (isManualRefresh) {
      setRefreshing(true)
    }
    
    try {
      // Fetch dashboard stats with cache-busting
      const cacheBuster = Date.now()
      const statsResponse = await fetch(`/api/dashboard/stats?t=${cacheBuster}&nocache=${Math.random()}`, {
        headers: {
          'x-api-key': 'ra1-dashboard-api-key-2024',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('📊 Fresh dashboard stats received:', statsData)
        console.log('📊 Raw API response:', JSON.stringify(statsData, null, 2))
        
        // Extract the actual stats from API response {success: true, data: {...}}
        const actualStats = statsData.data || statsData
        console.log('📈 ONLY 3 cards updating with:', {
          totalParents: actualStats.totalParents,
          totalPotentialRevenue: actualStats.totalPotentialRevenue,
          overduePayments: actualStats.overduePayments
        })
        
        setStats(actualStats)
      }

      // No other API calls needed - only 3 cards now
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
      console.log('🔔 Dashboard received parent-deleted event, refreshing 3 cards...')
      fetchDashboardData()
    }
    
    console.log('🎧 Dashboard event listener registered for parent-deleted events')
    window.addEventListener('parent-deleted', handleParentDeleted)
    return () => {
      console.log('🔇 Dashboard event listener removed')
      window.removeEventListener('parent-deleted', handleParentDeleted)
    }
  }, [])

  // quickActions removed - section deleted per user request

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
          
          {/* Loading skeleton for 3 stats cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
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

        {/* ONLY 3 Cards - As Requested */}
        {stats && <StatsCards stats={stats} />}
      </div>
    </AppLayout>
  )
}