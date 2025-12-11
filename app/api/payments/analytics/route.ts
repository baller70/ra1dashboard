
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const program = (searchParams.get('program') || '').trim() || undefined
  const season = (searchParams.get('season') || '').trim() || undefined
  const yearParam = (searchParams.get('year') || '').trim()
  const year = yearParam ? parseInt(yearParam, 10) : undefined

  try {
    await requireAuthWithApiKeyBypass(request)

    // Filters
    const parentFilter = program ? { program } : {}
    const planWhere: any = program ? { parents: parentFilter } : {}
    const paymentWhereBase: any = program ? { parents: parentFilter } : {}

    if (season) {
      planWhere.season = season
      paymentWhereBase.OR = [
        { season },
        { payment_plans: { season } }
      ]
    }
    if (year && !isNaN(year)) {
      planWhere.year = year
      paymentWhereBase.OR = paymentWhereBase.OR || []
      paymentWhereBase.OR.push({ year }, { payment_plans: { year } })
    }

    // Fetch payment plans to compute totals and active plans
    const plans = await prisma.payment_plans.findMany({
      where: planWhere,
      select: {
        id: true,
        parentId: true,
        totalAmount: true,
        installmentAmount: true,
        installments: true,
        status: true,
      }
    })

    const totalRevenue = plans.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0)
    const activePlans = plans.filter(p => {
      const status = String(p.status || '').toLowerCase()
      return status === 'active' || status === 'pending'
    })
    const activePlansCount = new Set(activePlans.map(p => p.parentId || p.id)).size

    // Payments aggregation
    const paidPayments = await prisma.payments.findMany({
      where: { ...paymentWhereBase, status: 'paid' },
      select: { amount: true }
    })
    const pendingPaymentsRows = await prisma.payments.findMany({
      where: { ...paymentWhereBase, NOT: { status: 'paid' } },
      select: { amount: true, dueDate: true, status: true }
    })

    const collectedPayments = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const now = new Date()
    const overdueRows = pendingPaymentsRows.filter(p => p.dueDate && p.dueDate < now)
    const overduePayments = overdueRows.reduce((s, p) => s + Number(p.amount || 0), 0)
    const overdueCount = overdueRows.length
    const pendingPayments = pendingPaymentsRows
      .filter(p => !p.dueDate || p.dueDate >= now)
      .reduce((s, p) => s + Number(p.amount || 0), 0)

    const result = {
      totalRevenue,
      collectedPayments,
      pendingPayments,
      overduePayments,
      overdueCount,
      activePlans: activePlansCount,
      avgPaymentTime: 0,
    }

    return NextResponse.json({ success: true, data: result }, { headers: { 'Cache-Control': 'no-store, max-age=0, s-maxage=0, stale-while-revalidate=0' } })
  } catch (error) {
    console.error('Payment analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics', detail: (error as any)?.message || String(error) },
      { status: 500 }
    )
  }
}
