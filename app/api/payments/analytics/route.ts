
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Payment analytics API called - returning empty data since all data has been purged...')
    
    // ALL PAYMENT DATA HAS BEEN PERMANENTLY PURGED
    // Return empty/zero values since database has been cleared
    const emptyPaymentAnalytics = {
      totalParents: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      paymentSuccessRate: 0,
      averagePaymentTime: 0,
      paymentsByStatus: {
        paid: 0,
        pending: 0,
        overdue: 0,
        cancelled: 0
      },
      monthlyRevenue: [],
      recentPayments: []
    };
    
    return NextResponse.json({
      success: true,
      data: emptyPaymentAnalytics
    })
  } catch (error) {
    console.error('Payment analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics' },
      { status: 500 }
    )
  }
}
