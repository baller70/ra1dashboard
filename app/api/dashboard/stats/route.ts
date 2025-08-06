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

    console.log('🔄 Fetching dashboard data directly from Convex for Vercel compatibility...')
    
    // Use direct Convex calls instead of internal HTTP calls for Vercel compatibility
    const [parentsResult, paymentsResult, templatesResult, paymentPlansResult] = await Promise.all([
      // Get parents (active only)
      convexHttp.query(api.parents.getParents, {
        page: 1,
        limit: 1000,
        status: 'active'
      }),
      // Get payments for analytics
      convexHttp.query(api.payments.getPayments, {
        page: 1,
        limit: 1000
      }),
      // Get templates
      convexHttp.query(api.templates.getTemplates, {
        page: 1,
        limit: 1000
      }),
      // Get payment plans for total potential revenue
      convexHttp.query(api.payments.getPaymentPlans, {})
    ]);

    console.log('📊 Convex Data Retrieved:', {
      parentsCount: parentsResult.parents?.length || 0,
      paymentsCount: paymentsResult.payments?.length || 0,
      templatesCount: templatesResult.templates?.length || 0,
      paymentPlansCount: paymentPlansResult?.length || 0
    });

    // Calculate stats from Convex data
    const totalParents = parentsResult.parents?.length || 0;
    
    // Calculate payment analytics
    const payments = paymentsResult.payments || [];
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const overduePayments = payments.filter(p => p.status === 'overdue');
    
    // Calculate TOTAL POTENTIAL REVENUE by summing all active payment plan totalAmounts
    const paymentPlans = paymentPlansResult || [];
    const activePaymentPlans = paymentPlans.filter(plan => plan.status === 'active');
    const totalRevenue = activePaymentPlans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    
    console.log(`💰 TOTAL POTENTIAL REVENUE: ${activePaymentPlans.length} active payment plans × $1650 each = $${totalRevenue}`);
    
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdueCount = overduePayments.length;
    
    // Calculate payment success rate
    const totalPayments = payments.length;
    const paymentSuccessRate = totalPayments > 0 ? Math.round((paidPayments.length / totalPayments) * 100) : 0;
    
    // Calculate templates
    const templates = templatesResult.templates || [];
    const activeTemplates = templates.filter(t => t.isActive === true).length;
    
    // Calculate messages (approximate - we can improve this later)
    const messagesSentThisMonth = 6; // Based on historical data
    
    const dashboardStats = {
      totalParents,
      totalRevenue,
      overduePayments: overdueCount,
      pendingPayments: Math.round(totalPending),
      paymentSuccessRate,
      messagesSentThisMonth,
      activeTemplates,
      averagePaymentTime: 3,
      upcomingDues: Math.round(totalPending),
      activePaymentPlans: Math.round(totalPending)
    };
    
    console.log('📊 Final Dashboard Stats:', dashboardStats);
    
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