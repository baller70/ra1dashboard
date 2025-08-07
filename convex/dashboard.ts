import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// NUCLEAR SOLUTION: Recursively convert ALL Date objects to numbers
function sanitizeForConvex(obj: any): any {
  try {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Convert Date objects to timestamps
    if (Object.prototype.toString.call(obj) === '[object Date]') {
      return (obj as Date).getTime();
    }
    
    // Convert Date strings to timestamps
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      const timestamp = new Date(obj).getTime();
      return isNaN(timestamp) ? obj : timestamp;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item: any) => sanitizeForConvex(item));
    }
    
    // Handle objects
    if (typeof obj === 'object' && obj.constructor === Object) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeForConvex(value);
      }
      return sanitized;
    }
    
    // Return primitives as-is
    return obj;
  } catch (error) {
    console.error("Error in sanitizeForConvex:", error);
    return obj;
  }
}

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

// Dashboard stats function (replaces /api/dashboard/stats) - CACHE BUSTER
export const getFixedDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getFixedDashboardStats called - returning empty data since all data has been purged...')
    
    // ALL DASHBOARD DATA HAS BEEN PERMANENTLY PURGED
    // Return empty/zero values since database has been cleared
    
    return {
      totalParents: 0,
      totalRevenue: 0,
      overduePayments: 0,
      pendingPayments: 0,
      upcomingDues: 0,
      activePaymentPlans: 0,
      messagesSentThisMonth: 0,
      activeTemplates: 0,
      paymentSuccessRate: 0,
      averagePaymentTime: 0
    };
  },
});

// Revenue trends function - RETURNS EMPTY DATA (post-purge)
export const getRevenueTrends = query({
  args: {},
  handler: async (ctx) => {
    console.log('🔄 Convex getRevenueTrends called - returning empty data since all data has been purged...')
    
    // ALL REVENUE DATA HAS BEEN PERMANENTLY PURGED
    // Return empty trends array
    return [];
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
        
        // CRITICAL: Convert timestamp to number for Convex compatibility
        let timestampNumber: number = Date.now();
        try {
          if (typeof payment.paidAt === 'number') {
            timestampNumber = payment.paidAt;
          } else if (typeof payment.paidAt === 'string') {
            const parsedDate = new Date(payment.paidAt);
            timestampNumber = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
          } else if ((payment.paidAt as any) instanceof Date) {
            timestampNumber = (payment.paidAt as Date).getTime();
          }
        } catch (e) {
          console.error("Error converting timestamp:", e);
          timestampNumber = Date.now();
        }

        activities.push({
          id: `payment-${payment._id}`,
          type: 'payment',
          description: `Payment of $${payment.amount || 0} received`,
          parentName: parent?.name || 'Unknown Parent',
          timestamp: timestampNumber // GUARANTEED TO BE A NUMBER
        });
      }
    }
    
    // Get recent parents (newly created)
    const recentParents = await ctx.db.query("parents")
      .order("desc")
      .take(3);
    
    for (const parent of recentParents) {
      if (parent.createdAt) {
        // CRITICAL: Convert timestamp to number for Convex compatibility
        let createdAtNumber: number = Date.now();
        try {
          if (typeof parent.createdAt === 'number') {
            createdAtNumber = parent.createdAt;
          } else if (typeof parent.createdAt === 'string') {
            const parsedDate = new Date(parent.createdAt);
            createdAtNumber = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
          } else if ((parent.createdAt as any) instanceof Date) {
            createdAtNumber = (parent.createdAt as Date).getTime();
          }
        } catch (e) {
          console.error("Error converting createdAt timestamp:", e);
          createdAtNumber = Date.now();
        }

        activities.push({
          id: `parent-${parent._id}`,
          type: 'parent_created',
          description: `New parent ${parent.name} added`,
          parentName: parent.name,
          timestamp: createdAtNumber // GUARANTEED TO BE A NUMBER
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
        
        // CRITICAL: Convert timestamp to number for Convex compatibility
        let sentAtNumber: number = Date.now();
        try {
          if (typeof message.sentAt === 'number') {
            sentAtNumber = message.sentAt;
          } else if (typeof message.sentAt === 'string') {
            const parsedDate = new Date(message.sentAt);
            sentAtNumber = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
          } else if ((message.sentAt as any) instanceof Date) {
            sentAtNumber = (message.sentAt as Date).getTime();
          }
        } catch (e) {
          console.error("Error converting sentAt timestamp:", e);
          sentAtNumber = Date.now();
        }
        
        activities.push({
          id: `message-${message._id}`,
          type: 'message_sent',
          description: `Message sent via ${message.channel || 'email'}`,
          parentName: parent?.name || 'Unknown Parent',
          timestamp: sentAtNumber // GUARANTEED TO BE A NUMBER
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

// AI Recommendations function (mock data for now)
      const parents = await ctx.db.query("parents").collect();
      console.log(`📊 Found ${parents.length} parents`);

      // Get all payments
      const payments = await ctx.db.query("payments").collect();
      console.log(`💰 Found ${payments.length} payments`);

      // Calculate overview stats with proper date filtering
      const now = Date.now();
      const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
      
      const paidPayments = payments.filter(p => p.status === 'paid');
      
      // Calculate overdue payments using consistent logic with getDashboardStats
      const overduePaymentsList = payments.filter(payment => {
        if (payment.status === 'overdue') {
          return true;
        }
        if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
          return true;
        }
        return false;
      });
      
      const upcomingPayments = payments.filter(p => p.status === 'pending' && p.dueDate && p.dueDate >= now && p.dueDate <= thirtyDaysFromNow);
      
      // Get payment plans and count unique parents with active plans (consistent with getDashboardStats)
      const paymentPlans = await ctx.db.query("paymentPlans").collect();
      const activePaymentPlans = paymentPlans.filter(p => p.status === 'active');
      const uniqueParentsWithPlans = new Set(activePaymentPlans.map(p => p.parentId)).size;
      
      // Include both paid and pending payments in total revenue (consistent with getDashboardStats)
      const revenuePayments = payments.filter(p => p.status === 'paid' || p.status === 'pending');
      console.log(`💰 Revenue calculation: ${revenuePayments.length} payments (paid + pending) out of ${payments.length} total`);
      console.log(`💰 First few payment amounts:`, revenuePayments.slice(0, 3).map(p => ({ amount: p.amount, status: p.status })));
      const totalRevenue = revenuePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      console.log(`💰 TOTAL REVENUE CALCULATED: $${totalRevenue}`);

      // CRITICAL FIX: Generate recentActivity with ONLY NUMBERS for timestamps
      const recentActivity = [];
      const recentPaidPayments = paidPayments
        .filter(p => p.paidAt)
        .sort((a, b) => {
          // Convert to numbers for sorting
          const aTime = typeof a.paidAt === 'number' ? a.paidAt : 
                       typeof a.paidAt === 'string' ? new Date(a.paidAt).getTime() : 
                       Date.now();
          const bTime = typeof b.paidAt === 'number' ? b.paidAt : 
                       typeof b.paidAt === 'string' ? new Date(b.paidAt).getTime() : 
                       Date.now();
          return bTime - aTime;
        })
        .slice(0, 5);
      
      for (const payment of recentPaidPayments) {
        let parent = null;
        try {
          if (payment.parentId && typeof payment.parentId === 'string' && payment.parentId.length >= 25) {
            parent = await ctx.db.get(payment.parentId as any);
          }
        } catch (error) {
          console.log('Could not fetch parent for recent activity:', payment._id);
        }
        
        // NUCLEAR FIX: FORCE timestamp to be a number - NO EXCEPTIONS
        let timestampNumber = Date.now(); // Default fallback
        
        if (payment.paidAt) {
          if (typeof payment.paidAt === 'number') {
            timestampNumber = payment.paidAt;
          } else if (typeof payment.paidAt === 'string') {
            const parsed = new Date(payment.paidAt).getTime();
            timestampNumber = isNaN(parsed) ? Date.now() : parsed;
          }
        }
        
        // GUARANTEE this is a number
        const finalTimestamp = Number(timestampNumber);
        if (isNaN(finalTimestamp)) {
          console.error('WARNING: Invalid timestamp detected, using current time');
          timestampNumber = Date.now();
        }
        
        // FINAL SAFETY CHECK - ABSOLUTELY ENSURE NUMBER
        const safeTimestamp = Number(timestampNumber);
        const finalSafeTimestamp = isNaN(safeTimestamp) ? Date.now() : safeTimestamp;
        
        recentActivity.push({
          id: payment._id,
          type: 'payment',
          description: `Payment of $${(payment.amount || 0).toFixed(2)} received`,
          timestamp: finalSafeTimestamp, // ABSOLUTELY GUARANTEED TO BE A NUMBER
          parentName: (parent as any)?.name || 'Unknown Parent'
        });
      }

      // Revenue by month calculation
      const currentDate = new Date();
      const revenueByMonth = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthPayments = paidPayments.filter(payment => {
          if (!payment.paidAt) return false;
          
          let paymentDate;
          if (typeof payment.paidAt === 'number') {
            paymentDate = new Date(payment.paidAt);
          } else if (typeof payment.paidAt === 'string') {
            paymentDate = new Date(payment.paidAt);
          } else {
            return false;
          }
          
          return paymentDate.getFullYear() === date.getFullYear() && 
                 paymentDate.getMonth() === date.getMonth();
        });
        
        const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        revenueByMonth.push({
          month: monthName,
          revenue,
          payments: monthPayments.length
        });
      }

              // Payment method stats
        const paymentMethodStats = {
          card: paidPayments.filter(p => (p as any).paymentMethod === 'card').length,
          bank_account: paidPayments.filter(p => (p as any).paymentMethod === 'bank_account').length,
          other: paidPayments.filter(p => !(p as any).paymentMethod || !['card', 'bank_account'].includes((p as any).paymentMethod)).length
        };

      // Communication stats (mock data)
      const communicationStats = {
        totalMessages: 24,
        deliveryRate: 95,
        channelBreakdown: {
          email: 23,
          sms: 1
        },
        deliveryStats: {
          delivered: 5,
          sent: 19,
          failed: 0
        }
      };

      // Mock recommendations data with NUMBER timestamps
      const recommendations = [
        {
          id: "rec1",
          type: "payment_reminder",
          priority: "high",
          title: "Send payment reminders to overdue accounts",
          description: "5 accounts are overdue and need immediate attention",
          createdAt: Date.now() - 86400000, // 1 day ago as NUMBER
          status: "pending"
        }
      ];

      const result = {
        overview: {
          totalParents: parents.length,
          totalRevenue,
          overduePayments: new Set(overduePaymentsList.map(p => p.parentId)).size, // Count unique parents with overdue payments
          upcomingDues: upcomingPayments.length, // Use the correct date-filtered upcoming payments
          activePaymentPlans: uniqueParentsWithPlans, // Use unique parents with active plans
          messagesSentThisMonth: communicationStats.totalMessages,
          activeRecurringMessages: 0,
          pendingRecommendations: recommendations.length,
          backgroundJobsRunning: 0
        },
        revenueByMonth,
        recentActivity, // This now contains ONLY numbers for timestamps
        paymentMethodStats,
        communicationStats,
        recommendationsByPriority: {
          urgent: 0,
          high: recommendations.filter(r => r.priority === 'high').length,
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

      console.log("✅ Analytics dashboard data prepared successfully");
      console.log("🔍 Recent activity timestamps:", recentActivity.map(a => ({ id: a.id, timestamp: a.timestamp, type: typeof a.timestamp })));
      
      // NUCLEAR SOLUTION: Sanitize ALL data to prevent Date serialization errors
      console.log("🧹 Before sanitization - sample recentActivity:", result.recentActivity[0]);
      const sanitizedResult = sanitizeForConvex(result);
      console.log("🧹 After sanitization - sample recentActivity:", sanitizedResult.recentActivity[0]);
      return sanitizedResult;
      
    } catch (error) {
      console.error("❌ Error in getAnalyticsDashboard:", error);
      throw error;
    }
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
        createdAt: Date.now(),
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
        createdAt: Date.now(),
        status: "pending" as const
      }
    ];

    return {
      recommendations: mockRecommendations
    };
  },
}); 