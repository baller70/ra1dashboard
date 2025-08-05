'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '../components/app-layout'
import { StatsCards } from '../components/dashboard/stats-cards'

interface DashboardStats {
  totalParents: number
  totalRevenue: number
  overduePayments: number
  pendingPayments: number
  paymentSuccessRate: number
  messagesSentThisMonth: number
  activeTemplates: number
  averagePaymentTime: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'x-api-key': 'ra1-dashboard-api-key-2024',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setStats(data.data || data)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your Rise as One Basketball Program dashboard
          </p>
        </div>

        {/* Stats Cards */}
        {stats && <StatsCards stats={stats} />}
        
        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-sm">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      </div>
    </AppLayout>
  )
}