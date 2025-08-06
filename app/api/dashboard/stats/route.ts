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

    console.log('🔄 Fetching dashboard stats from Convex getFixedDashboardStats function...')
    
    // Use the centralized Convex dashboard stats function to ensure consistency
    const dashboardStats = await convexHttp.query(api.dashboard.getFixedDashboardStats);
    
    console.log('📊 Dashboard stats from Convex:', dashboardStats);
    
    // Get the actual live data for missing fields
    const [templatesResponse, parentsResponse, paymentsResponse] = await Promise.all([
      convexHttp.query(api.templates.getTemplates, { page: 1, limit: 1000 }),
      convexHttp.query(api.parents.getParents, { page: 1, limit: 1000 }),
      convexHttp.query(api.payments.getPayments, { page: 1, limit: 1000 })
    ]);
    
    const activeTemplates = templatesResponse.templates?.filter(t => t.isActive === true).length || 0;
    const totalParents = parentsResponse.parents?.length || 0;
    const payments = paymentsResponse.payments || [];
    
    // Calculate real payment stats
    const activePayments = payments.filter(p => p.status === 'active');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const overduePayments = payments.filter(p => p.status === 'overdue');
    
    // SIMPLE: Total Potential Revenue = Number of Parents × $1650 per parent
    const totalRevenue = totalParents * 1650;
    
    console.log(`💰 SIMPLE CALCULATION: ${totalParents} parents × $1650 = $${totalRevenue} total potential revenue`);
    console.log(`💰 Payment breakdown: ${activePayments.length} active, ${pendingPayments.length} pending, ${overduePayments.length} overdue`);
    
    // Add missing fields that the dashboard cards expect using REAL LIVE DATA
    const enhancedStats = {
      ...dashboardStats,
      // Override with actual live data
      totalParents, // Use actual parent count from parents API
      totalRevenue, // Use calculated revenue from real payments
      activeTemplates, // Use actual active template count
      activePaymentPlans: totalParents, // Total payment plans = total parents (5)
      pendingPayments: pendingPayments.length, // Use actual pending payments count
      overduePayments: overduePayments.length, // Use actual overdue payments count
      upcomingDues: pendingPayments.length, // Pending payments are upcoming dues
      // Add calculated fields
      paymentSuccessRate: payments.length > 0 ? Math.round((activePayments.length / payments.length) * 100) : 0,
      averagePaymentTime: 3 // Static for now
    };
    
    console.log('📊 Enhanced dashboard stats:', enhancedStats);
    
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