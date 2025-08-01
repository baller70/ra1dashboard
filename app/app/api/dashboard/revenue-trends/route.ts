
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    // BYPASS CONVEX CACHE - Manual revenue trends calculation
    // Get all payments directly via API
    const paymentsResponse = await fetch('https://ra1dashboard.vercel.app/api/payments?page=1&limit=1000', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData.data.payments;
    
    // Filter for paid and pending payments (actual revenue)
    const eligiblePayments = payments.filter((p: any) => p.status === 'paid' || p.status === 'pending');
    
    // Group payments by month for the last 6 months
    const trends = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      // Use createdAt for grouping since paidAt might not be set
      const monthPayments = eligiblePayments.filter((p: any) => {
        const paymentDate = p.paidAt || p.createdAt || p.dueDate;
        return paymentDate && paymentDate >= month.getTime() && paymentDate < nextMonth.getTime();
      });
      
      const revenue = monthPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      trends.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        payments: monthPayments.length,
        _manual: true // Flag to show this is bypassing cache
      });
    }

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Revenue trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue trends' },
      { status: 500 }
    )
  }
}
