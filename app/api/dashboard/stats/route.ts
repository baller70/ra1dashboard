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

    console.log('🔄 Fetching dashboard data directly from Convex...')
    
    // Get all data directly from Convex
    const [parents, templates, messageLogs, payments] = await Promise.all([
      convexHttp.query(api.parents.getParents, { page: 1, limit: 1000 }),
      convexHttp.query(api.templates.getTemplates, { page: 1, limit: 1000 }),
      convexHttp.query(api.messageLogs.getMessageLogs, { page: 1, limit: 1000 }),
      convexHttp.query(api.payments.getPayments, { page: 1, limit: 1000 })
    ]);

    // Calculate stats
    const totalParents = parents.parents?.length || 0;
    const activeTemplates = templates.templates?.filter(t => t.isActive === true).length || 0;
    const messagesSentThisMonth = messageLogs.messages?.length || 0;
    
    // Calculate revenue from active payments
    const activePayments = payments.payments?.filter(p => p.status === 'active') || [];
    const totalRevenue = activePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate other stats
    const overduePayments = payments.payments?.filter(p => p.status === 'overdue').length || 0;
    const pendingPayments = payments.payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    const dashboardStats = {
      totalParents,
      totalRevenue,
      overduePayments,
      pendingPayments,
      paymentSuccessRate: 11, // Mock value
      messagesSentThisMonth,
      activeTemplates,
      averagePaymentTime: 3
    };
    
    console.log('📊 Dashboard Stats:', dashboardStats);
    
    const response = createSuccessResponse(dashboardStats)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    
    return createErrorResponse(
      ApiErrors.serverError('Failed to fetch dashboard stats', error.message)
    )
  }
}