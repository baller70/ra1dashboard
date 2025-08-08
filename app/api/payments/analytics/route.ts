
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Payment analytics API called - fetching LIVE data from Convex...')
    
    // FETCH LIVE PAYMENT DATA FROM CONVEX
    let paymentAnalytics = await convex.query(api.payments.getPaymentAnalytics, {});

    // Post-process using authoritative plans list (never infer from parents)
    try {
      // Prefer using our own API endpoint to ensure consistency across environments
      const baseUrl = request.url.includes('localhost') ? 'http://localhost:3000' : `https://${request.headers.get('host')}`
      const plansRes = await fetch(`${baseUrl}/api/payment-plans?_t=${Date.now()}`, {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' },
        cache: 'no-store'
      })
      const plansArr: any[] = plansRes.ok ? await plansRes.json() : []
      const countablePlans = (plansArr || []).filter((p: any) => {
        const status = String(p.status || '').toLowerCase()
        return status === 'active' || status === 'pending'
      })
      // Deduplicate multiple plans per parent using the largest totalAmount
      const planByParent: Record<string, any> = {}
      for (const plan of countablePlans) {
        const parentKey = String(plan.parentId || '')
        const current = planByParent[parentKey]
        if (!current || Number(plan.totalAmount || 0) > Number(current.totalAmount || 0)) {
          planByParent[parentKey] = plan
        }
      }
      const uniquePlans = Object.values(planByParent) as any[]
      const plansTotal = uniquePlans.reduce((s: number, p: any) => s + Number(p.totalAmount || 0), 0)
      const activePlans = new Set(uniquePlans.map((p: any) => p.parentId)).size

      // Keep collected from backend (paid + first installments), recompute pending from authoritative totals
      const collected = Number(paymentAnalytics?.collectedPayments || 0)

      paymentAnalytics = {
        ...paymentAnalytics,
        totalRevenue: plansTotal,
        collectedPayments: collected,
        pendingPayments: Math.max(plansTotal - collected, 0),
        activePlans,
      }
    } catch (ppErr) {
      console.warn('Post-process analytics adjustment failed:', ppErr);
    }
    
    console.log('📊 Live payment analytics (adjusted):', paymentAnalytics)
    
    return NextResponse.json({ success: true, data: paymentAnalytics })
  } catch (error) {
    console.error('Payment analytics error:', error)
    // Robust fallback so dashboard doesn't break if primary query fails
    try {
      console.log('⚠️ Falling back to derived analytics...')
      // Parents count → potential revenue
      const parentsRes: any = await convex.query(api.parents.getParents as any, { page: 1, limit: 1 })
      const parentsTotal = parentsRes?.pagination?.total || 0

      // Pending and paid payments sums
      const pendingRes: any = await convex.query(api.payments.getPayments as any, { status: 'pending', page: 1, limit: 1000 })
      const paidRes: any = await convex.query(api.payments.getPayments as any, { status: 'paid', page: 1, limit: 1000 })
      const pendingPayments = Array.isArray(pendingRes?.payments) ? pendingRes.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) : 0
      const collectedPayments = Array.isArray(paidRes?.payments) ? paidRes.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) : 0

      // Overdue count
      const overdueCount: number = await convex.query(api.payments.getOverduePaymentsCount as any, {})

      // Active plans (count unique parents)
      const activePlansArr: any[] = await convex.query(api.payments.getPaymentPlans as any, { status: 'active' })
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
