
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET() {
  try {
    await requireAuth()
    
    console.log('📊 Fetching analytics dashboard data from Convex...')
    
    // Get analytics dashboard data from Convex
    const dashboardData = await convexHttp.query(api.dashboard.getAnalyticsDashboard, {});
    
    console.log('✅ Successfully fetched analytics data')
    console.log('📋 Data keys:', Object.keys(dashboardData))
    
    // Log the structure to identify any problematic fields
    if (dashboardData.recentActivity) {
      console.log('🔍 Recent activity sample:', dashboardData.recentActivity[0])
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ Dashboard analytics error:', error)
    console.error('📝 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return a fallback response for development
    const fallbackData = {
      overview: {
        totalParents: 0,
        totalRevenue: 0,
        overduePayments: 0,
        upcomingDues: 0,
        activePaymentPlans: 0,
        messagesSentThisMonth: 0,
        activeRecurringMessages: 0,
        pendingRecommendations: 0,
        backgroundJobsRunning: 0,
      },
      revenueByMonth: [],
      recentActivity: [],
      paymentMethodStats: {
        card: 0,
        bank_account: 0,
        other: 0
      },
      communicationStats: {
        totalMessages: 0,
        deliveryRate: 95,
        channelBreakdown: {
          email: 0,
          sms: 0
        },
        deliveryStats: {
          delivered: 0,
          sent: 0,
          failed: 0
        }
      },
      recommendationsByPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      recurringMessageStats: {
        totalRecurring: 0,
        activeRecurring: 0,
        messagesSentThisWeek: 0,
        averageSuccessRate: 0
      }
    }
    
    return NextResponse.json(fallbackData)
  }
}
