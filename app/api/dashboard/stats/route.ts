
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import { 
  requireAuthWithApiKeyBypass, 
  createErrorResponse, 
  createSuccessResponse, 
  isDatabaseError,
  ApiErrors 
} from '../../../../lib/api-utils'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)

    // BYPASS CONVEX CACHE - Correct revenue calculation using payment plans
    // Get payment plans directly via API (more accurate than individual payments)
    const paymentPlansResponse = await fetch('https://ra1dashboard.vercel.app/api/payment-plans', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const paymentPlansData = await paymentPlansResponse.json();
    const paymentPlans = paymentPlansData;
    
    // Calculate revenue from active payment plans (avoid duplicates by grouping by parent)
    const activePaymentPlans = paymentPlans.filter((p: any) => p.status === 'active');
    const plansByParent = activePaymentPlans.reduce((acc: any, plan: any) => {
      if (!acc[plan.parentId] || plan.createdAt > acc[plan.parentId].createdAt) {
        acc[plan.parentId] = plan; // Keep the latest plan per parent
      }
      return acc;
    }, {});
    const totalRevenue = Object.values(plansByParent).reduce((sum: number, plan: any) => sum + (plan.totalAmount || 0), 0);
    
    // MANUAL CALCULATION FOR ACTIVE PLANS - Count unique parents with active plans
    const activePaymentPlansCount = Object.keys(plansByParent).length;
    
    // MANUAL CALCULATION FOR MESSAGES SENT - Get from both scheduledMessages and messageLogs
    const scheduledMessagesResponse = await fetch('https://ra1dashboard.vercel.app/api/messages/scheduled', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const scheduledMessagesData = await scheduledMessagesResponse.json();
    const scheduledMessages = scheduledMessagesData.data || [];
    
    // Get message logs from communication history
    const messageHistoryResponse = await fetch('https://ra1dashboard.vercel.app/api/communication/history', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const messageHistoryData = await messageHistoryResponse.json();
    const messageLogs = messageHistoryData.data || [];
    
    // Calculate messages sent this month
    const now = Date.now();
    const startOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const scheduledThisMonth = scheduledMessages.filter((msg: any) => msg.sentAt && msg.sentAt >= startOfMonth);
    const logsThisMonth = messageLogs.filter((msg: any) => msg.sentAt && msg.sentAt >= startOfMonth);
    const messagesSentThisMonth = scheduledThisMonth.length + logsThisMonth.length;
    
    // MANUAL CALCULATION FOR OVERDUE PAYMENTS - Get unique parents with overdue payments
    const paymentsResponse = await fetch('https://ra1dashboard.vercel.app/api/payments?page=1&limit=1000', {
      headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
    });
    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData.data.payments;
    
    // Find overdue payments
    const overduePayments = payments.filter((payment: any) => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    });
    const uniqueParentsWithOverduePayments = new Set(overduePayments.map((p: any) => p.parentId)).size;
    
    // MANUAL CALCULATION FOR UPCOMING DUES - Count payments that are pending and due in the future
    const upcomingPayments = payments.filter((payment: any) => {
      return payment.status === 'pending' && payment.dueDate && payment.dueDate > now;
    });
    const upcomingDues = upcomingPayments.length;
    
    // Get other stats from Convex (keep working parts)
    const convexStats = await convexHttp.query(api.dashboard.getDashboardStats, {});
    
    // Override with correct manual calculations
    const stats = {
      ...convexStats,
      totalRevenue, // Use manual calculation
      activePaymentPlans: activePaymentPlansCount, // Use manual calculation
      messagesSentThisMonth, // Use manual calculation
      overduePayments: uniqueParentsWithOverduePayments, // Use manual calculation
      upcomingDues, // Use manual calculation
      _manual: true // Flag to show this is bypassing cache
    };

    return createSuccessResponse(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return createErrorResponse(ApiErrors.UNAUTHORIZED)
    }
    
    if (isDatabaseError(error)) {
      return createSuccessResponse({
        message: 'Please check database configuration',
        fallbackStats: {
          totalParents: 0,
          totalRevenue: 0,
          overduePayments: 0,
          upcomingDues: 0,
          activePaymentPlans: 0,
          messagesSentThisMonth: 0
        }
      })
    }
    
    return createErrorResponse(ApiErrors.INTERNAL_ERROR)
  }
}
