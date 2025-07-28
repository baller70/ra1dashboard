
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/convex-server'
import { api } from '../../../../convex/_generated/api'
import { requireAuth } from '../../../../lib/api-utils'

// NUCLEAR SOLUTION: Convert ALL timestamps to numbers at API level
function sanitizeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Convert Date objects to timestamps
  if (obj instanceof Date) {
    return obj.getTime()
  }

  // Convert ISO date strings to timestamps
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    const timestamp = new Date(obj).getTime()
    return isNaN(timestamp) ? obj : timestamp
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeTimestamps(item))
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeTimestamps(value)
    }
    return sanitized
  }

  return obj
}

export async function GET() {
  try {
    await requireAuth()

    console.log('🔧 Development mode: Fetching analytics dashboard data')

    // Get analytics dashboard data from Convex
    const rawData = await convexHttp.query(api.dashboard.getAnalyticsDashboard, {})
    
    console.log('🔍 Raw data received from Convex')
    
    // NUCLEAR SANITIZATION: Convert ALL timestamps to numbers
    const sanitizedData = sanitizeTimestamps(rawData)
    
    console.log('✅ Data sanitized - all timestamps converted to numbers')
    console.log('🔍 Sample recent activity after sanitization:', sanitizedData.recentActivity?.[0])

    return NextResponse.json(sanitizedData)

  } catch (error) {
    console.error('❌ Dashboard analytics error:', error)
    
    // Return a safe fallback response
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
        backgroundJobsRunning: 0
      },
      revenueByMonth: [],
      recentActivity: [],
      paymentMethodStats: { card: 0, bank_account: 0, other: 0 },
      communicationStats: {
        totalMessages: 0,
        deliveryRate: 0,
        channelBreakdown: { email: 0, sms: 0 },
        deliveryStats: { delivered: 0, sent: 0, failed: 0 }
      },
      recommendationsByPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      recurringMessageStats: {
        totalRecurring: 0,
        activeRecurring: 0,
        messagesSentThisWeek: 0,
        averageSuccessRate: 0
      }
    }

    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Failed to fetch analytics',
      data: fallbackData
    }, { status: 500 })
  }
}
