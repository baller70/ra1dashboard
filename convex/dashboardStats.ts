import { query } from "./_generated/server";
import { v } from "convex/values";

// SUPER CLEAN Dashboard Stats - Fixed for Active Templates Card
export const getDashboardStats = query({
  args: {
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      console.log('🔄 Starting dashboard stats query...');
      
      // 1. TOTAL PARENTS - Live counter
      let totalParents = 0;
      try {
        const parents = await ctx.db.query("parents").collect();
        totalParents = parents.length;
        console.log(`✅ Total Parents: ${totalParents}`);
      } catch (error) {
        console.error('❌ Parents query failed:', error);
        totalParents = 0;
      }

      // 2. ACTIVE TEMPLATES - Live counter (FIXED)
      let activeTemplates = 0;
      try {
        const templates = await ctx.db.query("templates").collect();
        const activeTemplatesList = templates.filter(template => template.isActive === true);
        activeTemplates = activeTemplatesList.length;
        console.log(`✅ Active Templates: ${activeTemplates}`, activeTemplatesList.map(t => ({ name: t.name, isActive: t.isActive })));
      } catch (error) {
        console.error('❌ Templates query failed:', error);
        activeTemplates = 0;
      }

      // 3. MESSAGES SENT - Live counter
      let messagesSent = 0;
      try {
        const messages = await ctx.db.query("messageLogs").collect();
        messagesSent = messages.length;
        console.log(`✅ Messages Sent: ${messagesSent}`);
      } catch (error) {
        console.error('❌ Messages query failed:', error);
        messagesSent = 0;
      }

      // 4. REVENUE DATA - Live counter
      let totalRevenue = 0;
      let overdueCount = 0;
      let pendingPayments = 0;
      let paymentSuccessRate = 0;
      
      try {
        const payments = await ctx.db.query("payments").collect();
        
        // Calculate revenue from active payments
        const activePayments = payments.filter(p => 
          (p.status === 'paid' || p.status === 'pending' || p.status === 'active') && 
          typeof p.amount === 'number' && 
          p.amount > 0
        );
        
        totalRevenue = activePayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Count overdue payments
        const now = Date.now();
        const overduePayments = payments.filter(payment => {
          return payment.status === 'overdue' || 
                 (payment.status === 'pending' && payment.dueDate && payment.dueDate < now);
        });
        
        overdueCount = new Set(overduePayments.map(p => p.parentId)).size;
        
        // Calculate pending amount
        const pendingPaymentsList = payments.filter(p => p.status === 'pending');
        pendingPayments = pendingPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        // Simple success rate calculation
        const paidPayments = payments.filter(p => p.status === 'paid');
        paymentSuccessRate = payments.length > 0 ? Math.round((paidPayments.length / payments.length) * 100) : 0;
        
        console.log(`✅ Revenue Data: $${totalRevenue}, Overdue: ${overdueCount}, Pending: $${pendingPayments}, Success: ${paymentSuccessRate}%`);
      } catch (error) {
        console.error('❌ Payments query failed:', error);
      }

      const result = {
        totalParents,
        activeTemplates,
        messagesSent,
        totalRevenue,
        overdueCount,
        pendingPayments,
        paymentSuccessRate,
        avgPaymentTime: 3,
        lastUpdated: Date.now()
      };

      console.log('📊 Dashboard stats result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Dashboard stats query failed:', error);
      
      // Return safe defaults
      return {
        totalParents: 0,
        activeTemplates: 0,
        messagesSent: 0,
        totalRevenue: 0,
        overdueCount: 0,
        pendingPayments: 0,
        paymentSuccessRate: 0,
        avgPaymentTime: 3,
        lastUpdated: Date.now(),
        error: 'Query failed'
      };
    }
  },
});