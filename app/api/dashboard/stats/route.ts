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
    const [parentsRes, paymentsRes, templatesRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/parents`, { headers }),
      fetch(`${baseUrl}/api/payments/analytics`, { headers }),
      fetch(`${baseUrl}/api/templates`, { headers })
    ])

    let totalParents = 0
    let totalPotentialRevenue = 0
    let overduePayments = 0
    let activeTemplates = 0

    // Parents data from Parent page API
    if (parentsRes.status === 'fulfilled' && parentsRes.value.ok) {
      const parentsData = await parentsRes.value.json()
      totalParents = parentsData?.data?.pagination?.total || 0
    }

    // Payment data from Payment page API
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
      const paymentsData = await paymentsRes.value.json()
      if (paymentsData.success && paymentsData.data) {
        totalPotentialRevenue = paymentsData.data.totalRevenue || 0
        overduePayments = paymentsData.data.overdueCount || 0
      }
    }

    // Templates data from Templates page API
    if (templatesRes.status === 'fulfilled' && templatesRes.value.ok) {
      const templatesData = await templatesRes.value.json()
      activeTemplates = Array.isArray(templatesData) ? templatesData.length : 0
    }

    const dashboardStats = {
      totalParents,
      totalPotentialRevenue,
      overduePayments,
      pendingPayments: 0,
      upcomingDues: overduePayments,
      activePaymentPlans: 0,
      activeTemplates,
      totalMessages: 0, // Messages API is broken due to Resend
      paymentSuccessRate: 0
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