
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    // BYPASS CONVEX CACHE - Manual revenue trends calculation using PAYMENT PLANS
    // Get payment plans (not individual payments to avoid duplicates)
    const paymentPlansResponse = await fetch('https://ra1dashboard.vercel.app/api/payment-plans', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const paymentPlansData = await paymentPlansResponse.json();
    const paymentPlans = paymentPlansData;
    
    // Filter for active payment plans (actual committed revenue)
    const activePaymentPlans = paymentPlans.filter((p: any) => p.status === 'active');
    
    // Group by parent to avoid duplicates (take latest plan per parent)
    const plansByParent = activePaymentPlans.reduce((acc: any, plan: any) => {
      if (!acc[plan.parentId] || plan.createdAt > acc[plan.parentId].createdAt) {
        acc[plan.parentId] = plan;
      }
      return acc;
    }, {});
    
    // Convert back to array for processing
    const eligiblePayments = Object.values(plansByParent);
    
    // Group payments by month for the last 6 months
    const trends = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      // Use createdAt for grouping payment plans by month
      const monthPaymentPlans = eligiblePayments.filter((p: any) => {
        const planDate = p.createdAt;
        return planDate && planDate >= month.getTime() && planDate < nextMonth.getTime();
      });
      
      const revenue = monthPaymentPlans.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
      
      trends.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        payments: monthPaymentPlans.length,
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
