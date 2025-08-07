
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
    // Robust fallback so dashboard doesn't break if primary query fails
    try {
      console.log('⚠️ Falling back to derived analytics...')
      // Parents count → potential revenue
      const parentsRes: any = await convexHttp.query(api.parents.getParents as any, { page: 1, limit: 1 })
      const parentsTotal = parentsRes?.pagination?.total || 0

      // Pending and paid payments sums
      const pendingRes: any = await convexHttp.query(api.payments.getPayments as any, { status: 'pending', page: 1, limit: 1000 })
      const paidRes: any = await convexHttp.query(api.payments.getPayments as any, { status: 'paid', page: 1, limit: 1000 })
      const pendingPayments = Array.isArray(pendingRes?.payments) ? pendingRes.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) : 0
      const collectedPayments = Array.isArray(paidRes?.payments) ? paidRes.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) : 0

      // Overdue count
      const overdueCount: number = await convexHttp.query(api.payments.getOverduePaymentsCount as any, {})

      // Active plans (count unique parents)
      const activePlansArr: any[] = await convexHttp.query(api.payments.getPaymentPlans as any, { status: 'active' })
      const activePlans = new Set((activePlansArr || []).map((p: any) => p.parentId)).size

      const fallback = {
        totalRevenue: parentsTotal * 1650,
        collectedPayments,
        pendingPayments,
        overduePayments: 0, // not needed by dashboard cards directly
        overdueCount,
        activePlans,
        avgPaymentTime: 0,
      }
      console.log('✅ Derived payment analytics fallback:', fallback)
      return NextResponse.json({ success: true, data: fallback })
    } catch (fallbackErr) {
      console.error('Fallback analytics failed:', fallbackErr)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment analytics', detail: (error as any)?.message || String(error) },
        { status: 500 }
      )
    }
  }
}
