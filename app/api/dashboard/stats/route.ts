export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse, 
  ApiErrors 
} from '../../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    console.log('🔄 Fetching SIMPLE dashboard stats (only 3 fields needed)...')
    
    // Get only the data we need for the 6 cards
    const [parentsResponse, paymentsResponse] = await Promise.all([
      convexHttp.query(api.parents.getParents, { page: 1, limit: 1000 }),
      convexHttp.query(api.payments.getPayments, { page: 1, limit: 1000 })
    ]);
    
    // SIMPLE CALCULATIONS
    const totalParents = parentsResponse.parents?.length || 0;
    const payments = paymentsResponse.payments || [];
    const overduePayments = payments.filter(p => p.status === 'overdue').length;
    const totalPotentialRevenue = totalParents * 1650; // Simple: Parents × $1650
    
    console.log(`📊 SIMPLE DASHBOARD DATA:`);
    console.log(`   👥 Total Parents: ${totalParents}`);
    console.log(`   💰 Total Potential Revenue: $${totalPotentialRevenue} (${totalParents} × $1650)`);
    console.log(`   ⚠️  Overdue Payments: ${overduePayments}`);
    
    // Return only the 3 fields needed for the simplified dashboard
    const enhancedStats = {
      totalParents,
      totalPotentialRevenue,
      overduePayments
    };
    
    console.log('✅ Simple dashboard stats:', enhancedStats);
    
    const response = createSuccessResponse(enhancedStats)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    
    return createErrorResponse(
      'Failed to fetch dashboard stats: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      ApiErrors.INTERNAL_ERROR
    )
  }
}