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

    console.log('🔄 FORCE REFRESH: Fetching FRESH dashboard data...')
    
    // Get fresh data directly from Convex with no caching
    const [templatesResponse, parentsResponse, paymentsResponse] = await Promise.all([
      convexHttp.query(api.templates.getTemplates, { page: 1, limit: 1000 }),
      convexHttp.query(api.parents.getParents, { page: 1, limit: 1000 }),
      convexHttp.query(api.payments.getPayments, { page: 1, limit: 1000 })
    ]);
    
    const activeTemplates = templatesResponse.templates?.filter(t => t.isActive === true).length || 0;
    const totalParents = parentsResponse.parents?.length || 0;
    const payments = paymentsResponse.payments || [];
    
    console.log(`🔄 FORCE REFRESH RESULTS:`);
    console.log(`📊 Parents: ${totalParents} (IDs: ${parentsResponse.parents?.map(p => p.name).join(', ')})`);
    console.log(`📧 Templates: ${activeTemplates}`);
    console.log(`💰 Payments: ${payments.length}`);
    
    // Calculate payment stats
    const activePayments = payments.filter(p => p.status === 'active');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const overduePayments = payments.filter(p => p.status === 'overdue');
    
    // SIMPLE: Total Revenue = Parents × $1650
    const totalRevenue = totalParents * 1650;
    
    const refreshedStats = {
      totalParents,
      totalRevenue,
      activeTemplates,
      activePaymentPlans: totalParents, // 1 per parent
      pendingPayments: pendingPayments.length,
      overduePayments: overduePayments.length,
      upcomingDues: pendingPayments.length,
      messagesSentThisMonth: 6, // Static for now
      paymentSuccessRate: payments.length > 0 ? Math.round((activePayments.length / payments.length) * 100) : 0,
      averagePaymentTime: 3,
      refreshedAt: new Date().toISOString()
    };
    
    console.log('🔄 FORCE REFRESH FINAL STATS:', refreshedStats);
    
    const response = createSuccessResponse(refreshedStats)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Force-Refresh', 'true')
    
    return response
    
  } catch (error) {
    console.error('Force refresh error:', error)
    
    return createErrorResponse(
      'Failed to force refresh dashboard: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      ApiErrors.INTERNAL_ERROR
    )
  }
}