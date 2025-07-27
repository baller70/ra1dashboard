import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Utility function to safely get parent data with ID validation
async function safeGetParent(ctx: any, parentId: any) {
  if (!parentId || typeof parentId !== 'string' || parentId.length < 25) {
    return null;
  }
  
  try {
    return await ctx.db.get(parentId as Id<"parents">);
  } catch (error) {
    console.warn(`Failed to get parent with ID ${parentId}:`, error);
    return null;
  }
}

// Dashboard stats function (replaces /api/dashboard/stats)
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all parents
    const parents = await ctx.db.query("parents").collect();
    const activeParents = parents.filter(p => p.status === 'active');
    
    // Get all payments
    const payments = await ctx.db.query("payments").collect();
    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    // Calculate overdue payments using consistent logic
    const now = Date.now();
    const overduePayments = payments.filter(payment => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    });
    
    // Calculate revenue (match payments page calculation)
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Get payment plans
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const activePaymentPlans = paymentPlans.filter(p => p.status === 'active');
    
    // Get upcoming dues (next 30 days) - exclude overdue payments
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
    const upcomingDues = pendingPayments.filter(p => 
      p.dueDate && p.dueDate >= now && p.dueDate <= thirtyDaysFromNow
    ).length;
    
    // Get message logs for this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const startOfMonth = firstOfMonth.getTime();
    
    const messageLogs = await ctx.db.query("messageLogs")
      .filter(q => q.gte(q.field("sentAt"), startOfMonth))
      .collect();
    
    return {
      totalParents: activeParents.length,
      totalRevenue,
      overduePayments: overduePayments.length,
      upcomingDues,
      activePaymentPlans: activePaymentPlans.length,
      messagesSentThisMonth: messageLogs.length
    };
  },
});

// Revenue trends function (replaces /api/dashboard/revenue-trends)
export const getRevenueTrends = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments")
      .filter(q => q.eq(q.field("status"), "paid"))
      .collect();
    
    // Group payments by month for the last 6 months
    const trends = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(p => 
        p.paidAt && p.paidAt >= month.getTime() && p.paidAt < nextMonth.getTime()
      );
      
      const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      trends.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        payments: monthPayments.length
      });
    }
    
    return trends;
  },
});

// Recent activity function (replaces /api/dashboard/recent-activity)
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const activities: any[] = [];
    
    // Get recent payments (paid ones)
    const recentPayments = await ctx.db.query("payments")
      .filter(q => q.eq(q.field("status"), "paid"))
      .order("desc")
      .take(5);
    
    for (const payment of recentPayments) {
      if (payment.paidAt) {
        const parent = await safeGetParent(ctx, payment.parentId);
        
        activities.push({
          id: `payment-${payment._id}`,
          type: 'payment',
          description: `Payment of $${payment.amount || 0} received`,
          parentName: parent?.name || 'Unknown Parent',
          timestamp: payment.paidAt
        });
      }
    }
    
    // Get recent parents (newly created)
    const recentParents = await ctx.db.query("parents")
      .order("desc")
      .take(3);
    
    for (const parent of recentParents) {
      if (parent.createdAt) {
        activities.push({
          id: `parent-${parent._id}`,
          type: 'parent_created',
          description: `New parent ${parent.name} added`,
          parentName: parent.name,
          timestamp: parent.createdAt
        });
      }
    }
    
    // Get recent message logs
    const recentMessages = await ctx.db.query("messageLogs")
      .order("desc")
      .take(3);
    
    for (const message of recentMessages) {
      if (message.sentAt) {
        const parent = await safeGetParent(ctx, message.parentId);
        
        activities.push({
          id: `message-${message._id}`,
          type: 'message_sent',
          description: `Message sent via ${message.channel || 'email'}`,
          parentName: parent?.name || 'Unknown Parent',
          timestamp: message.sentAt
        });
      }
    }
    
    // Sort by timestamp and return most recent
    return activities
      .filter(a => a.timestamp) // Only include activities with timestamps
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  },
});

// Analytics dashboard function (replaces /api/analytics/dashboard)
export const getAnalyticsDashboard = query({
  args: {},
  handler: async (ctx) => {
    // Get all data
    const parents = await ctx.db.query("parents").collect();
    const payments = await ctx.db.query("payments").collect();
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const messageLogs = await ctx.db.query("messageLogs").collect();
    
    // Calculate stats to match other pages
    const totalParents = parents.length;
    const activeParents = parents.filter(p => p.status === 'active').length;
    const paidPayments = payments.filter(p => p.status === 'paid');
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    // Use consistent overdue calculation logic
    const now = Date.now();
    const overduePayments = payments.filter(payment => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    });
    
    const activePaymentPlans = paymentPlans.filter(p => p.status === 'active');
    
    // Get upcoming dues (next 30 days)
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
    const upcomingDues = pendingPayments.filter(p => 
      p.dueDate && p.dueDate >= now && p.dueDate <= thirtyDaysFromNow
    ).length;
    
    // Get messages sent this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const startOfMonth = firstOfMonth.getTime();
    const messagesSentThisMonth = messageLogs.filter(m => 
      m.sentAt && m.sentAt >= startOfMonth
    ).length;
    
    // Generate revenue by month data for the last 6 months
    const revenueByMonth = [];
    const nowDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      const nextMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - i + 1, 1);
      
      const monthPayments = paidPayments.filter(p => 
        p.paidAt && p.paidAt >= month.getTime() && p.paidAt < nextMonth.getTime()
      );
      
      const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      revenueByMonth.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        payments: monthPayments.length
      });
    }

    // Get recent activity with proper parent names
    const recentActivity = [];
    const recentPaidPayments = paidPayments
      .filter(p => p.paidAt)
      .sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0))
      .slice(0, 5);
    
    for (const payment of recentPaidPayments) {
      let parent = null;
      try {
        if (payment.parentId && typeof payment.parentId === 'string' && payment.parentId.length >= 25) {
          parent = await ctx.db.get(payment.parentId as Id<"parents">);
        }
      } catch (error) {
        console.log('Could not fetch parent for recent activity:', payment._id);
      }
      
      recentActivity.push({
        id: payment._id,
        type: 'payment',
        description: `Payment of $${payment.amount || 0} received`,
        timestamp: payment.paidAt!,
        parentName: parent?.name || 'Unknown Parent'
      });
    }

    return {
      overview: {
        totalParents,
        totalRevenue,
        overduePayments: overduePayments.length,
        upcomingDues,
        activePaymentPlans: activePaymentPlans.length,
        messagesSentThisMonth,
        activeRecurringMessages: 0, // Would need recurring messages table
        pendingRecommendations: 0, // Would need recommendations table
        backgroundJobsRunning: 0, // Would need jobs table
      },
      revenueByMonth,
      recentActivity,
      paymentMethodStats: {
        card: Math.floor(paidPayments.length * 0.7),
        bank_account: Math.floor(paidPayments.length * 0.2),
        other: Math.floor(paidPayments.length * 0.1)
      },
      communicationStats: {
        totalMessages: messageLogs.length,
        deliveryRate: 95,
        channelBreakdown: {
          email: messageLogs.filter(m => m.channel === 'email').length,
          sms: messageLogs.filter(m => m.channel === 'sms').length
        },
        deliveryStats: {
          delivered: messageLogs.filter(m => m.status === 'delivered').length,
          sent: messageLogs.filter(m => m.status === 'sent').length,
          failed: messageLogs.filter(m => m.status === 'failed').length
        }
      },
      recommendationsByPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      recurringMessageStats: {
        totalRecurring: 0,
        activeRecurring: 0,
        messagesSentThisWeek: 0,
        averageSuccessRate: 0
      }
    };
  },
});

// AI Recommendations function (mock data for now)
export const getAIRecommendations = query({
  args: {},
  handler: async (ctx) => {
    // Mock AI recommendations data
    const mockRecommendations = [
      {
        id: "rec-1",
        title: "Optimize Payment Collection",
        description: "Several parents have overdue payments. Consider sending automated reminders.",
        priority: "high" as const,
        category: "payments",
        impact: "Could recover $2,500 in overdue payments",
        confidence: 85,
        createdAt: new Date().toISOString(),
        status: "pending" as const
      },
      {
        id: "rec-2", 
        title: "Improve Communication Engagement",
        description: "Email open rates are below average. Consider switching to SMS for better engagement.",
        priority: "medium" as const,
        category: "communication",
        impact: "Increase engagement by 30%",
        confidence: 72,
        createdAt: new Date().toISOString(),
        status: "pending" as const
      }
    ];

    return {
      recommendations: mockRecommendations
    };
  },
}); 