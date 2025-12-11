
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    console.log('🔄 Revenue trends API (Postgres) - computing from payment_plans...')

    // Fetch all payment plans
    const plans = await prisma.payment_plans.findMany({
      select: {
        totalAmount: true,
        installmentAmount: true,
        installments: true,
        createdAt: true,
        startDate: true,
        parentId: true,
      }
    })
    console.log(`📄 Plans fetched for trends: ${plans.length}`)

    // Bucket by year-month based on createdAt/startDate
    const bucket: Record<string, { revenue: number; payments: number }> = {};
    for (const p of plans || []) {
      if (!p || !p.parentId) continue; // must be tied to a parent
      const ts = (p.createdAt ?? p.startDate)?.getTime();
      if (!ts || Number.isNaN(ts)) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      bucket[key] ||= { revenue: 0, payments: 0 };
      const total = Number(p.totalAmount ?? 0) || (Number(p.installmentAmount ?? 0) * Number(p.installments ?? 0)) || Number(p.installmentAmount ?? 0) || 0;
      bucket[key].revenue += total;
      bucket[key].payments += 1; // count plans created that month
    }

    // Convert to array and pad to last 6 months
    const now = new Date();
    const lastSixKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      lastSixKeys.push(`${d.getFullYear()}-${d.getMonth()}`);
    }

    const trends = lastSixKeys.map((key) => {
      const [y, m] = key.split('-');
      const date = new Date(parseInt(y), parseInt(m), 1);
      const data = bucket[key] || { revenue: 0, payments: 0 };
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: data.revenue,
        payments: data.payments,
      };
    });

    console.log('📈 PLAN-BASED REVENUE TRENDS:', trends)
    return NextResponse.json(trends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    
    // Return empty trends if error occurs
    return NextResponse.json([])
  }
}
