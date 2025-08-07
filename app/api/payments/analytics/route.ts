
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Payment analytics API called - fetching LIVE data from Convex...')
    
    // FETCH LIVE PAYMENT DATA FROM CONVEX
    const paymentAnalytics = await convexHttp.query(api.payments.getPaymentAnalytics, {});
    
    console.log('📊 Live payment analytics:', paymentAnalytics)
    
    return NextResponse.json({
      success: true,
      data: paymentAnalytics
    })
  } catch (error) {
    console.error('Payment analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics' },
      { status: 500 }
    )
  }
}
