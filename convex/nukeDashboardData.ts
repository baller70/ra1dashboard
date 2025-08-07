import { mutation } from "./_generated/server";

// NUCLEAR OPTION: Delete absolutely EVERYTHING from dashboard-related tables
export const nukeDashboardData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log('🚨 NUCLEAR OPTION: Deleting ALL dashboard data...')
    
    const deletionStats: Record<string, number> = {};
    
    // Get all tables that could contain dashboard/analytics data
    const tablesToNuke = [
      "parents",
      "payments", 
      "paymentPlans",
      "paymentInstallments",
      "contracts",
      "notifications",
      "messageLogs",
      "messageThreads", 
      "messageAnalytics",
      "messageAttachments",
      "scheduledMessages",
      "recurringMessages",
      "recurringInstances",
      "recurringRecipients",
      "backgroundJobs",
      "jobLogs",
      "stripeWebhookEvents",
      "stripeInvoices", 
      "stripeSubscriptions",
      "teams",
      "templates",
      "users",
      "auditLogs",
      "aiRecommendations",
      "aiRecommendationActions",
      "contractTemplates"
    ];
    
    // Delete EVERYTHING from each table
    for (const tableName of tablesToNuke) {
      try {
        const records = await ctx.db.query(tableName as any).collect();
        console.log(`🔥 Found ${records.length} records in ${tableName}`);
        
        let deletedCount = 0;
        for (const record of records) {
          await ctx.db.delete(record._id);
          deletedCount++;
        }
        
        deletionStats[tableName] = deletedCount;
        console.log(`✅ Deleted ${deletedCount} records from ${tableName}`);
      } catch (error) {
        console.error(`❌ Error deleting from ${tableName}:`, error);
        deletionStats[tableName] = 0;
      }
    }
    
    console.log('🔥 NUCLEAR DELETION COMPLETE');
    console.log('📊 Final deletion stats:', deletionStats);
    
    return {
      success: true,
      message: "NUCLEAR OPTION: ALL dashboard data permanently deleted",
      deletionStats,
      totalDeleted: Object.values(deletionStats).reduce((sum, count) => sum + count, 0)
    };
  },
});