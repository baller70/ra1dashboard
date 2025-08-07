export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔄 Dashboard stats API - calling the EXACT SAME API routes as the pages use...')

    const baseUrl = request.url.includes('localhost') ? 'http://localhost:3000' : 
                    `https://${request.headers.get('host')}`
    const headers = { 'x-api-key': 'ra1-dashboard-api-key-2024' }

    // CALL THE EXACT SAME APIs THAT THE PAGES USE
    const cacheBust = Date.now()
    const requestInit: RequestInit = { headers, cache: 'no-store' }
    const [parentsRes, paymentsRes, templatesRes, messagesRes, plansRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/parents?_t=${cacheBust}`, requestInit),
      fetch(`${baseUrl}/api/payments/analytics?_t=${cacheBust}`, requestInit),
      fetch(`${baseUrl}/api/templates?_t=${cacheBust}`, requestInit),
      // Use communication history endpoint to derive total messages count
      fetch(`${baseUrl}/api/communication/history?limit=1&page=1&_t=${cacheBust}`, requestInit),
      fetch(`${baseUrl}/api/payment-plans?_t=${cacheBust}`, requestInit)
    ])

    let totalParents = 0
    let totalPotentialRevenue = 0
    let totalRevenue = 0
    let overduePayments = 0
    let activeTemplates = 0
    let pendingPayments = 0
    let activePaymentPlans = 0
    let totalMessages = 0

    // Parents data from Parent page API
    if (parentsRes.status === 'fulfilled' && parentsRes.value.ok) {
      const parentsData = await parentsRes.value.json()
      totalParents = parentsData?.data?.pagination?.total || 0
    }

    // Payment data from Payment page API
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
      const paymentsData = await paymentsRes.value.json()
      if (paymentsData.success && paymentsData.data) {
        // We'll override potential revenue from plans below for accuracy
        totalPotentialRevenue = paymentsData.data.totalRevenue || 0
        // Dashboard cards: overduePayments shows count
        overduePayments = paymentsData.data.overdueCount || 0
        // Pending payments card expects amount ($)
        pendingPayments = paymentsData.data.pendingPayments || 0
        // Active payment plans
        activePaymentPlans = paymentsData.data.activePlans || 0
        // Collected revenue for "Total Revenue" card
        totalRevenue = paymentsData.data.collectedPayments || 0
      }
    }

    // Payment plans (authoritative totals)
    if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
      try {
        const plans = await plansRes.value.json()
        if (Array.isArray(plans)) {
          const countable = plans.filter((p: any) => ['active', 'pending'].includes(p.status))
          const plansTotal = countable.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0)
          const uniqueParents = new Set(countable.map((p: any) => p.parentId)).size
          totalPotentialRevenue = plansTotal
          activePaymentPlans = uniqueParents
        }
      } catch {}
    }

    // Templates data from Templates page API
    if (templatesRes.status === 'fulfilled' && templatesRes.value.ok) {
      const templatesData = await templatesRes.value.json()
      activeTemplates = Array.isArray(templatesData) ? templatesData.length : 0
    }

    // Messages (communication history) total
    if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
      const messagesData = await messagesRes.value.json()
      // The endpoint returns { messages: [], pagination: { total } }
      totalMessages = messagesData?.pagination?.total || messagesData?.summary?.totalMessages || 0
    }

    // Compute a simple success rate: collected / (collected + pending) if available
    let paymentSuccessRate = 0
    try {
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const paymentsData = await paymentsRes.value.json()
        const collected = paymentsData?.data?.collectedPayments || 0
        const pendingAmt = paymentsData?.data?.pendingPayments || 0
        const denom = collected + pendingAmt
        paymentSuccessRate = denom > 0 ? Math.round((collected / denom) * 100) : 0
      }
    } catch {}

    const dashboardStats = {
      totalParents,
      totalPotentialRevenue,
      totalRevenue,
      overduePayments,            // count
      pendingPayments,            // amount ($)
      upcomingDues: overduePayments,
      activePaymentPlans,
      activeTemplates,
      totalMessages,
      paymentSuccessRate
    }

    console.log('📊 Dashboard data from actual page APIs:', dashboardStats)

    return NextResponse.json({
      success: true,
      data: dashboardStats
    })

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}