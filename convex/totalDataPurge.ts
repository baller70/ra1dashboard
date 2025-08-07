import { mutation } from "./_generated/server";
import { v } from "convex/values";

// COMPREHENSIVE DATA PURGE - Permanently delete ALL dashboard and analytics data
// This will keep core functionality (Communication, Payments, Contracts, Parents, Settings) intact
// But remove ALL data that feeds into dashboard and analytics calculations

export const purgeAllDashboardAnalyticsData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔥 STARTING TOTAL DATA PURGE - Dashboard & Analytics");
    
    let deletionStats = {
      parents: 0,
      payments: 0,
      paymentPlans: 0,
      paymentInstallments: 0,
      messageLogs: 0,
      messageAnalytics: 0,
      messageAttachments: 0,
      messageThreads: 0,
      scheduledMessages: 0,
      notifications: 0,
      contracts: 0,
      templates: 0,
      users: 0,
      teams: 0,
      stripeWebhookEvents: 0,
      backgroundJobs: 0
    };

    try {
      // 1. DELETE ALL PARENTS (this will break all dashboard calculations)
      console.log("🔥 Deleting ALL parents...");
      const allParents = await ctx.db.query("parents").collect();
      for (const parent of allParents) {
        await ctx.db.delete(parent._id);
        deletionStats.parents++;
      }

      // 2. DELETE ALL PAYMENTS (removes all revenue calculations)
      console.log("🔥 Deleting ALL payments...");
      const allPayments = await ctx.db.query("payments").collect();
      for (const payment of allPayments) {
        await ctx.db.delete(payment._id);
        deletionStats.payments++;
      }

      // 3. DELETE ALL PAYMENT PLANS (removes subscription data)
      console.log("🔥 Deleting ALL payment plans...");
      const allPaymentPlans = await ctx.db.query("paymentPlans").collect();
      for (const plan of allPaymentPlans) {
        await ctx.db.delete(plan._id);
        deletionStats.paymentPlans++;
      }

      // 4. DELETE ALL PAYMENT INSTALLMENTS
      console.log("🔥 Deleting ALL payment installments...");
      const allInstallments = await ctx.db.query("paymentInstallments").collect();
      for (const installment of allInstallments) {
        await ctx.db.delete(installment._id);
        deletionStats.paymentInstallments++;
      }

      // 5. DELETE ALL MESSAGE DATA (removes communication stats)
      console.log("🔥 Deleting ALL message logs...");
      const allMessageLogs = await ctx.db.query("messageLogs").collect();
      for (const message of allMessageLogs) {
        await ctx.db.delete(message._id);
        deletionStats.messageLogs++;
      }

      console.log("🔥 Deleting ALL message analytics...");
      const allMessageAnalytics = await ctx.db.query("messageAnalytics").collect();
      for (const analytics of allMessageAnalytics) {
        await ctx.db.delete(analytics._id);
        deletionStats.messageAnalytics++;
      }

      console.log("🔥 Deleting ALL message attachments...");
      const allMessageAttachments = await ctx.db.query("messageAttachments").collect();
      for (const attachment of allMessageAttachments) {
        await ctx.db.delete(attachment._id);
        deletionStats.messageAttachments++;
      }

      console.log("🔥 Deleting ALL message threads...");
      const allMessageThreads = await ctx.db.query("messageThreads").collect();
      for (const thread of allMessageThreads) {
        await ctx.db.delete(thread._id);
        deletionStats.messageThreads++;
      }

      console.log("🔥 Deleting ALL scheduled messages...");
      const allScheduledMessages = await ctx.db.query("scheduledMessages").collect();
      for (const message of allScheduledMessages) {
        await ctx.db.delete(message._id);
        deletionStats.scheduledMessages++;
      }

      // 6. DELETE ALL NOTIFICATIONS
      console.log("🔥 Deleting ALL notifications...");
      const allNotifications = await ctx.db.query("notifications").collect();
      for (const notification of allNotifications) {
        await ctx.db.delete(notification._id);
        deletionStats.notifications++;
      }

      // 7. DELETE ALL CONTRACTS
      console.log("🔥 Deleting ALL contracts...");
      const allContracts = await ctx.db.query("contracts").collect();
      for (const contract of allContracts) {
        await ctx.db.delete(contract._id);
        deletionStats.contracts++;
      }

      // 8. DELETE ALL TEMPLATES
      console.log("🔥 Deleting ALL templates...");
      const allTemplates = await ctx.db.query("templates").collect();
      for (const template of allTemplates) {
        await ctx.db.delete(template._id);
        deletionStats.templates++;
      }

      // 9. DELETE ALL USERS (except system users if needed)
      console.log("🔥 Deleting ALL users...");
      const allUsers = await ctx.db.query("users").collect();
      for (const user of allUsers) {
        await ctx.db.delete(user._id);
        deletionStats.users++;
      }

      // 10. DELETE ALL TEAMS
      console.log("🔥 Deleting ALL teams...");
      const allTeams = await ctx.db.query("teams").collect();
      for (const team of allTeams) {
        await ctx.db.delete(team._id);
        deletionStats.teams++;
      }

      // 11. DELETE ALL STRIPE WEBHOOK EVENTS
      console.log("🔥 Deleting ALL stripe webhook events...");
      const allStripeEvents = await ctx.db.query("stripeWebhookEvents").collect();
      for (const event of allStripeEvents) {
        await ctx.db.delete(event._id);
        deletionStats.stripeWebhookEvents++;
      }

      // 12. DELETE ALL BACKGROUND JOBS
      console.log("🔥 Deleting ALL background jobs...");
      const allBackgroundJobs = await ctx.db.query("backgroundJobs").collect();
      for (const job of allBackgroundJobs) {
        await ctx.db.delete(job._id);
        deletionStats.backgroundJobs++;
      }

      console.log("✅ TOTAL DATA PURGE COMPLETE!");
      console.log("📊 DELETION STATISTICS:");
      console.log(`   👥 Parents deleted: ${deletionStats.parents}`);
      console.log(`   💰 Payments deleted: ${deletionStats.payments}`);
      console.log(`   📋 Payment plans deleted: ${deletionStats.paymentPlans}`);
      console.log(`   💳 Payment installments deleted: ${deletionStats.paymentInstallments}`);
      console.log(`   📧 Message logs deleted: ${deletionStats.messageLogs}`);
      console.log(`   📊 Message analytics deleted: ${deletionStats.messageAnalytics}`);
      console.log(`   📎 Message attachments deleted: ${deletionStats.messageAttachments}`);
      console.log(`   💬 Message threads deleted: ${deletionStats.messageThreads}`);
      console.log(`   ⏰ Scheduled messages deleted: ${deletionStats.scheduledMessages}`);
      console.log(`   🔔 Notifications deleted: ${deletionStats.notifications}`);
      console.log(`   📄 Contracts deleted: ${deletionStats.contracts}`);
      console.log(`   📝 Templates deleted: ${deletionStats.templates}`);
      console.log(`   👤 Users deleted: ${deletionStats.users}`);
      console.log(`   👥 Teams deleted: ${deletionStats.teams}`);
      console.log(`   💳 Stripe events deleted: ${deletionStats.stripeWebhookEvents}`);
      console.log(`   ⚙️ Background jobs deleted: ${deletionStats.backgroundJobs}`);

      return {
        success: true,
        message: "ALL dashboard and analytics data permanently deleted",
        deletionStats
      };

    } catch (error) {
      console.error("❌ Error during data purge:", error);
      return {
        success: false,
        message: `Data purge failed: ${error}`,
        deletionStats
      };
    }
  },
});

// AUDIT FUNCTION - Check what data remains after purge
export const auditRemainingData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔍 AUDITING REMAINING DATA...");
    
    const audit = {
      parents: 0,
      payments: 0,
      paymentPlans: 0,
      paymentInstallments: 0,
      messageLogs: 0,
      messageAnalytics: 0,
      messageAttachments: 0,
      messageThreads: 0,
      scheduledMessages: 0,
      notifications: 0,
      contracts: 0,
      templates: 0,
      users: 0,
      teams: 0,
      stripeWebhookEvents: 0,
      backgroundJobs: 0
    };

    try {
      audit.parents = (await ctx.db.query("parents").collect()).length;
      audit.payments = (await ctx.db.query("payments").collect()).length;
      audit.paymentPlans = (await ctx.db.query("paymentPlans").collect()).length;
      audit.paymentInstallments = (await ctx.db.query("paymentInstallments").collect()).length;
      audit.messageLogs = (await ctx.db.query("messageLogs").collect()).length;
      audit.messageAnalytics = (await ctx.db.query("messageAnalytics").collect()).length;
      audit.messageAttachments = (await ctx.db.query("messageAttachments").collect()).length;
      audit.messageThreads = (await ctx.db.query("messageThreads").collect()).length;
      audit.scheduledMessages = (await ctx.db.query("scheduledMessages").collect()).length;
      audit.notifications = (await ctx.db.query("notifications").collect()).length;
      audit.contracts = (await ctx.db.query("contracts").collect()).length;
      audit.templates = (await ctx.db.query("templates").collect()).length;
      audit.users = (await ctx.db.query("users").collect()).length;
      audit.teams = (await ctx.db.query("teams").collect()).length;
      audit.stripeWebhookEvents = (await ctx.db.query("stripeWebhookEvents").collect()).length;
      audit.backgroundJobs = (await ctx.db.query("backgroundJobs").collect()).length;

      const totalRecords = Object.values(audit).reduce((sum, count) => sum + count, 0);

      console.log("📊 AUDIT RESULTS:");
      console.log(`   👥 Parents remaining: ${audit.parents}`);
      console.log(`   💰 Payments remaining: ${audit.payments}`);
      console.log(`   📋 Payment plans remaining: ${audit.paymentPlans}`);
      console.log(`   💳 Payment installments remaining: ${audit.paymentInstallments}`);
      console.log(`   📧 Message logs remaining: ${audit.messageLogs}`);
      console.log(`   📊 Message analytics remaining: ${audit.messageAnalytics}`);
      console.log(`   📎 Message attachments remaining: ${audit.messageAttachments}`);
      console.log(`   💬 Message threads remaining: ${audit.messageThreads}`);
      console.log(`   ⏰ Scheduled messages remaining: ${audit.scheduledMessages}`);
      console.log(`   🔔 Notifications remaining: ${audit.notifications}`);
      console.log(`   📄 Contracts remaining: ${audit.contracts}`);
      console.log(`   📝 Templates remaining: ${audit.templates}`);
      console.log(`   👤 Users remaining: ${audit.users}`);
      console.log(`   👥 Teams remaining: ${audit.teams}`);
      console.log(`   💳 Stripe events remaining: ${audit.stripeWebhookEvents}`);
      console.log(`   ⚙️ Background jobs remaining: ${audit.backgroundJobs}`);
      console.log(`   📊 TOTAL RECORDS REMAINING: ${totalRecords}`);

      return {
        success: true,
        audit,
        totalRecords,
        message: totalRecords === 0 ? "✅ Database is completely clean!" : `⚠️ ${totalRecords} records still remain`
      };

    } catch (error) {
      console.error("❌ Error during audit:", error);
      return {
        success: false,
        message: `Audit failed: ${error}`,
        audit
      };
    }
  },
});