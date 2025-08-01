export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { 
  requireAuthWithApiKeyBypass, 
  createSuccessResponse 
} from '../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    // Manual calculation to bypass Convex cache
    const paymentsResponse = await fetch('https://ra1dashboard.vercel.app/api/payments?page=1&limit=1000', {
      headers: {
        'x-api-key': 'ra1-dashboard-api-key-2024'
      }
    });
    
    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData.data.payments;
    
    // Calculate revenue manually
    const eligiblePayments = payments.filter((p: any) => p.status === 'paid' || p.status === 'pending');
    const totalRevenue = eligiblePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    return createSuccessResponse({
      totalPayments: payments.length,
      eligiblePayments: eligiblePayments.length,
      totalRevenue,
      calculation: 'Manual calculation bypassing Convex cache'
    });
    
  } catch (error) {
    console.error('Test revenue error:', error)
    return NextResponse.json({ error: 'Failed to calculate revenue' }, { status: 500 })
  }
}