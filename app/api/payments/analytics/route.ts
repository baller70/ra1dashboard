
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET() {
  try {
    // Temporarily disabled for development - uncomment when Clerk is properly configured
    // await requireAuth()
    
    // Get payment analytics from Convex
    const analytics = await convexHttp.query(api.payments.getPaymentAnalytics, {});

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: analytics.totalRevenue,
        totalPaid: analytics.collectedPayments,
        totalPending: analytics.pendingPayments,
        totalOverdue: analytics.overduePayments,
        overdueCount: analytics.overdueCount,
        paymentSuccessRate: analytics.totalRevenue > 0 ? 85 : 0, // Mock percentage
        averagePaymentTime: analytics.avgPaymentTime,
        monthlyTrends: [], // TODO: Implement monthly trends in Convex
        paymentMethodBreakdown: {
          card: 70,
          bank_account: 25,
          other: 5
        },
        overdueAnalysis: {
          totalOverdue: analytics.overdueCount,
          averageDaysOverdue: 15,
          recoveryRate: 75
        }
      }
    })
  } catch (error) {
    console.error('Payment analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics' },
      { status: 500 }
    )
  }
}
