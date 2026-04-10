export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET(request: Request) {
  if (!convex) {
    return NextResponse.json({ error: 'Convex not configured' }, { status: 503 });
  }

  try {
    console.log('🔄 Revenue trends API - fetching from Convex...');

    // Fetch payment plans from Convex
    const plans = await convex.query(api.payments.getPaymentPlans, {});
    console.log(`📄 Plans fetched for trends: ${plans?.length || 0}`);

    // Bucket by year-month
    const bucket: Record<string, { revenue: number; payments: number }> = {};
    for (const p of plans || []) {
      if (!p || !p.parentId) continue;
      const ts = p.createdAt || p._creationTime || p.startDate;
      if (!ts) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      bucket[key] ||= { revenue: 0, payments: 0 };
      const total = Number(p.totalAmount ?? 0) || (Number(p.installmentAmount ?? 0) * Number(p.installments ?? 0)) || 0;
      bucket[key].revenue += total;
      bucket[key].payments += 1;
    }

    // Build last 6 months
    const now = new Date();
    const months: { month: string; revenue: number; payments: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      months.push({
        month: label,
        revenue: bucket[key]?.revenue || 0,
        payments: bucket[key]?.payments || 0,
      });
    }

    console.log('📈 REVENUE TRENDS:', months);

    return NextResponse.json({
      success: true,
      trends: months
    });
  } catch (error) {
    console.error('Revenue trends error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue trends' },
      { status: 500 }
    );
  }
}
