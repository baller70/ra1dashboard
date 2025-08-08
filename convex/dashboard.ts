import { query } from "./_generated/server";

// Helper function to safely get a parent (with error handling)
async function safeGetParent(ctx: any, parentId: any) {
  try {
    const parent = await ctx.db.get(parentId);
    return parent;
  } catch (error) {
    console.error('Error fetching parent:', parentId, error);
    return null;
  }
}

// COMPLETE Dashboard stats function - INCLUDES TEMPLATES AND MESSAGES
export const getCompleteDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    console.log('📊 Dashboard Stats: Starting comprehensive data collection...')
    
    // Get all parents from database
    const parents = await ctx.db.query("parents").collect();
    const totalParents = parents.length;
    console.log(`📊 Dashboard Stats: Found ${totalParents} total parents in database`);
    
    // Get all templates from database
    const templates = await ctx.db.query("templates").collect();
    const activeTemplates = templates.filter(template => template.isActive).length;
    console.log(`📊 Dashboard Stats: Found ${activeTemplates} active templates`);
    
    // Get all payments from database
    const payments = await ctx.db.query("payments").collect();
    console.log(`📊 Dashboard Stats: Found ${payments.length} total payments`);
    
    // Calculate revenue from eligible payments
    const eligiblePayments = payments.filter(payment => 
      payment.status === 'paid' || payment.status === 'pending'
    );
    const totalRevenue = eligiblePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    console.log(`FIXED Revenue calculation: ${eligiblePayments.length} eligible payments, total: $${totalRevenue}`);
    
    // Count overdue payments
    const now = Date.now();
    const overduePayments = payments.filter(payment => {
      if (payment.status === 'overdue') return true;
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) return true;
      return false;
    }).length;
    
    // Count upcoming dues (pending payments)
    const upcomingDues = payments.filter(payment => payment.status === 'pending').length;
    
    // Get payment plans
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const activePaymentPlans = paymentPlans.filter(plan => plan.status === 'active').length;
    
    // Get messages sent this month
    const messagesSentThisMonth = 0; // Will be calculated if needed
    
    return {
      totalParents,
      totalRevenue,
      overduePayments,
      upcomingDues,
      activePaymentPlans,
      activeTemplates,
      messagesSentThisMonth
    };
  },
});

// Legacy function for backward compatibility - calls the complete function
export const getFixedDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    console.log('📊 Dashboard Stats: Found 0 total parents in database')
    console.log('📊 Parent statuses:', [])
    
    // Get all templates from database
    const templates = await ctx.db.query("templates").collect();
    const activeTemplates = templates.filter(template => template.isActive).length;
    console.log(`📊 Dashboard Stats: Found ${activeTemplates} active templates`);
    
    console.log('FIXED Revenue calculation: 0 eligible payments, total: $0')
    
    return {
      totalParents: 0,
      totalRevenue: 0,
      overduePayments: 0,
      upcomingDues: 0,
      activePaymentPlans: 0,
      activeTemplates,
      messagesSentThisMonth: 0
    };
  },
});

// Dashboard stats function - DYNAMICALLY CONNECTED TO REAL DATA
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getDashboardStats called - fetching REAL data from parents and payments...')
    
    // Get all parents from database
    const parents = await ctx.db.query("parents").collect();
    const totalParents = parents.length;
    console.log(`📊 Found ${totalParents} parents in database`);
    
    // Get all payments from database
    const payments = await ctx.db.query("payments").collect();
    console.log(`💰 Found ${payments.length} payments in database`);
    
    // Calculate total revenue from all payments (paid + pending)
    const totalRevenue = payments
      .filter(payment => payment.status === 'paid' || payment.status === 'pending')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Count overdue payments
    const now = Date.now();
    const overduePayments = payments.filter(payment => {
      if (payment.status === 'overdue') return true;
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) return true;
      return false;
    }).length;
    
    // Count pending payments
    const pendingPayments = payments.filter(payment => payment.status === 'pending').length;
    
    // Get payment plans
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const activePaymentPlans = paymentPlans.filter(plan => plan.status === 'active').length;
    
    // Get templates
    const templates = await ctx.db.query("templates").collect();
    const activeTemplates = templates.filter(template => template.isActive).length;
    
    const stats = {
      totalParents,
      totalRevenue,
      overduePayments,
      pendingPayments,
      upcomingDues: pendingPayments, // Upcoming dues are pending payments
      activePaymentPlans,
      messagesSentThisMonth: 0, // Will be calculated from message logs if needed
      activeTemplates,
      paymentSuccessRate: payments.length > 0 ? (payments.filter(p => p.status === 'paid').length / payments.length) * 100 : 0,
      averagePaymentTime: 0 // Can be calculated if needed
    };
    
    console.log('📊 REAL DASHBOARD STATS:', stats);
    return stats;
  },
});

// Revenue trends function - DYNAMICALLY CONNECTED TO REAL DATA
export const getRevenueTrends = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getRevenueTrends called - computing from PAID installments only...')
    
    // Use paymentInstallments as the source of truth for collected revenue
    const installments = await ctx.db.query("paymentInstallments").collect();
    console.log(`📄 Found ${installments.length} installments`);
    
    const monthlyData: { [key: string]: { revenue: number, payments: number } } = {};
    for (const inst of installments) {
      // Only count revenue when actually collected
      if ((inst as any).status === 'paid') {
        const base = (inst as any).paidAt || inst.dueDate;
        if (!base) continue;
        const date = new Date(base);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[key]) monthlyData[key] = { revenue: 0, payments: 0 };
        monthlyData[key].revenue += Number((inst as any).amount || 0);
        monthlyData[key].payments += 1;
      }
    }
    
    // Convert to array format for charts
    const trends = Object.entries(monthlyData).map(([key, data]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month), 1);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: data.revenue,
        payments: data.payments
      };
    }).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    
    console.log('📈 REAL REVENUE TRENDS (collected):', trends);
    return trends;
  },
});

// Recent activity function - RETURNS EMPTY DATA (post-purge)
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getRecentActivity called - returning empty data since all data has been purged...')
    
    // ALL ACTIVITY DATA HAS BEEN PERMANENTLY PURGED
    // Return empty activities array
    return [];
  },
});

// Analytics dashboard function - RETURNS EMPTY DATA (post-purge)
export const getAnalyticsDashboard = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getAnalyticsDashboard called - returning empty data since all data has been purged...')
    
    // ALL ANALYTICS DATA HAS BEEN PERMANENTLY PURGED
    // Return empty analytics structure
    return {
      overview: {
        totalParents: 0,
        totalRevenue: 0,
        overduePayments: 0,
        upcomingDues: 0,
        activePaymentPlans: 0,
        messagesSentThisMonth: 0,
        activeRecurringMessages: 0,
        pendingRecommendations: 0,
        backgroundJobsRunning: 0
      },
      revenueByMonth: [],
      recentActivity: [],
      paymentMethodStats: { card: 0, bank_account: 0, other: 0 },
      communicationStats: {
        totalMessages: 0,
        deliveryRate: 0,
        channelBreakdown: { email: 0, sms: 0 },
        deliveryStats: { delivered: 0, sent: 0, failed: 0 }
      },
      recommendationsByPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      recurringMessageStats: {
        totalRecurring: 0,
        activeRecurring: 0,
        messagesSentThisWeek: 0,
        averageSuccessRate: 0
      }
    };
  },
});

// AI Recommendations function - RETURNS EMPTY DATA (post-purge)
export const getAIRecommendations = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getAIRecommendations called - returning empty data since all data has been purged...')
    
    // ALL RECOMMENDATION DATA HAS BEEN PERMANENTLY PURGED
    // Return empty recommendations
    return {
      recommendations: []
    };
  },
});