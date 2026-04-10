export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    // Get payment analytics from Convex
    const analytics = await convex.query(api.payments.getPaymentAnalytics, {
      year: year ? parseInt(year) : undefined
    });

    const result = {
      totalRevenue: analytics?.totalRevenue || 0,
      collectedPayments: analytics?.collectedPayments || 0,
      pendingPayments: analytics?.pendingPayments || 0,
      overduePayments: analytics?.overduePayments || 0,
      overdueCount: analytics?.overdueCount || 0,
      activePlans: analytics?.activePlans || 0,
      avgPaymentTime: analytics?.avgPaymentTime || 0,
    };

    return NextResponse.json(
      { success: true, data: result },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Payment analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics' },
      { status: 500 }
    );
  }
}
