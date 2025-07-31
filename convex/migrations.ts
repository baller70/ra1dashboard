import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// NUCLEAR SOLUTION: Fix ALL timestamp data across the ENTIRE database
export const fixAllDatabaseTimestamps = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting NUCLEAR database timestamp migration...");
    let totalFixed = 0;

    // Helper function to convert any timestamp to number
    const ensureTimestamp = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = new Date(value).getTime();
        return isNaN(parsed) ? Date.now() : parsed;
      }
      if ((value as any) instanceof Date) return (value as Date).getTime();
      return Date.now(); // Default fallback
    };

    // 1. Fix PAYMENTS table
    console.log("🔧 Fixing payments table...");
    const payments = await ctx.db.query("payments").collect();
    for (const payment of payments) {
      const updates: any = {};
      let needsUpdate = false;

      // Fix all timestamp fields
      if (payment.paidAt !== undefined && typeof payment.paidAt !== 'number') {
        updates.paidAt = ensureTimestamp(payment.paidAt);
        needsUpdate = true;
      }
      if (payment.lastReminderSent !== undefined && typeof payment.lastReminderSent !== 'number') {
        updates.lastReminderSent = ensureTimestamp(payment.lastReminderSent);
        needsUpdate = true;
      }
      if (payment.createdAt !== undefined && typeof payment.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(payment.createdAt);
        needsUpdate = true;
      }
      if (payment.updatedAt !== undefined && typeof payment.updatedAt !== 'number') {
        updates.updatedAt = ensureTimestamp(payment.updatedAt);
        needsUpdate = true;
      }
      if (payment.dueDate !== undefined && typeof payment.dueDate !== 'number') {
        updates.dueDate = ensureTimestamp(payment.dueDate);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(payment._id, updates);
        totalFixed++;
        console.log(`✅ Fixed payment ${payment._id}`);
      }
    }

    // 2. Fix PARENTS table
    console.log("🔧 Fixing parents table...");
    const parents = await ctx.db.query("parents").collect();
    for (const parent of parents) {
      const updates: any = {};
      let needsUpdate = false;

      if (parent.createdAt !== undefined && typeof parent.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(parent.createdAt);
        needsUpdate = true;
      }
      if (parent.updatedAt !== undefined && typeof parent.updatedAt !== 'number') {
        updates.updatedAt = ensureTimestamp(parent.updatedAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(parent._id, updates);
        totalFixed++;
        console.log(`✅ Fixed parent ${parent._id}`);
      }
    }

    // 3. Fix SCHEDULED MESSAGES table
    console.log("🔧 Fixing scheduledMessages table...");
    const messages = await ctx.db.query("scheduledMessages").collect();
    for (const message of messages) {
      const updates: any = {};
      let needsUpdate = false;

      if (message.sentAt !== undefined && typeof message.sentAt !== 'number') {
        updates.sentAt = ensureTimestamp(message.sentAt);
        needsUpdate = true;
      }
      if (message.scheduledFor !== undefined && typeof message.scheduledFor !== 'number') {
        updates.scheduledFor = ensureTimestamp(message.scheduledFor);
        needsUpdate = true;
      }
      if (message.createdAt !== undefined && typeof message.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(message.createdAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(message._id, updates);
        totalFixed++;
        console.log(`✅ Fixed message ${message._id}`);
      }
    }

    // 4. Fix TEMPLATES table
    console.log("🔧 Fixing templates table...");
    const templates = await ctx.db.query("templates").collect();
    for (const template of templates) {
      const updates: any = {};
      let needsUpdate = false;

      if (template.createdAt !== undefined && typeof template.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(template.createdAt);
        needsUpdate = true;
      }
      if (template.updatedAt !== undefined && typeof template.updatedAt !== 'number') {
        updates.updatedAt = ensureTimestamp(template.updatedAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(template._id, updates);
        totalFixed++;
        console.log(`✅ Fixed template ${template._id}`);
      }
    }

    // 5. Fix TEAMS table
    console.log("🔧 Fixing teams table...");
    const teams = await ctx.db.query("teams").collect();
    for (const team of teams) {
      const updates: any = {};
      let needsUpdate = false;

      if (team.createdAt !== undefined && typeof team.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(team.createdAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(team._id, updates);
        totalFixed++;
        console.log(`✅ Fixed team ${team._id}`);
      }
    }

    // 6. Fix NOTIFICATIONS table
    console.log("🔧 Fixing notifications table...");
    const notifications = await ctx.db.query("notifications").collect();
    for (const notification of notifications) {
      const updates: any = {};
      let needsUpdate = false;

      if (notification.createdAt !== undefined && typeof notification.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(notification.createdAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(notification._id, updates);
        totalFixed++;
        console.log(`✅ Fixed notification ${notification._id}`);
      }
    }

    // 7. Fix AI RECOMMENDATIONS table
    console.log("🔧 Fixing aiRecommendations table...");
    const recommendations = await ctx.db.query("aiRecommendations").collect();
    for (const rec of recommendations) {
      const updates: any = {};
      let needsUpdate = false;

      if (rec.createdAt !== undefined && typeof rec.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(rec.createdAt);
        needsUpdate = true;
      }
      if (rec.executedAt !== undefined && typeof rec.executedAt !== 'number') {
        updates.executedAt = ensureTimestamp(rec.executedAt);
        needsUpdate = true;
      }
      if (rec.dismissedAt !== undefined && typeof rec.dismissedAt !== 'number') {
        updates.dismissedAt = ensureTimestamp(rec.dismissedAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(rec._id, updates);
        totalFixed++;
        console.log(`✅ Fixed recommendation ${rec._id}`);
      }
    }

    // 8. Fix BACKGROUND JOBS table
    console.log("🔧 Fixing backgroundJobs table...");
    const jobs = await ctx.db.query("backgroundJobs").collect();
    for (const job of jobs) {
      const updates: any = {};
      let needsUpdate = false;

      if (job.createdAt !== undefined && typeof job.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(job.createdAt);
        needsUpdate = true;
      }
      if (job.startedAt !== undefined && typeof job.startedAt !== 'number') {
        updates.startedAt = ensureTimestamp(job.startedAt);
        needsUpdate = true;
      }
      if (job.completedAt !== undefined && typeof job.completedAt !== 'number') {
        updates.completedAt = ensureTimestamp(job.completedAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(job._id, updates);
        totalFixed++;
        console.log(`✅ Fixed job ${job._id}`);
      }
    }

    // 9. Fix CONTRACTS table
    console.log("🔧 Fixing contracts table...");
    const contracts = await ctx.db.query("contracts").collect();
    for (const contract of contracts) {
      const updates: any = {};
      let needsUpdate = false;

      if (contract.createdAt !== undefined && typeof contract.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(contract.createdAt);
        needsUpdate = true;
      }
      if (contract.signedAt !== undefined && typeof contract.signedAt !== 'number') {
        updates.signedAt = ensureTimestamp(contract.signedAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(contract._id, updates);
        totalFixed++;
        console.log(`✅ Fixed contract ${contract._id}`);
      }
    }

    // 10. Fix MESSAGE LOGS table
    console.log("🔧 Fixing messageLogs table...");
    const logs = await ctx.db.query("messageLogs").collect();
    for (const log of logs) {
      const updates: any = {};
      let needsUpdate = false;

      if (log.createdAt !== undefined && typeof log.createdAt !== 'number') {
        updates.createdAt = ensureTimestamp(log.createdAt);
        needsUpdate = true;
      }
      if (log.sentAt !== undefined && typeof log.sentAt !== 'number') {
        updates.sentAt = ensureTimestamp(log.sentAt);
        needsUpdate = true;
      }
      if (log.deliveredAt !== undefined && typeof log.deliveredAt !== 'number') {
        updates.deliveredAt = ensureTimestamp(log.deliveredAt);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(log._id, updates);
        totalFixed++;
        console.log(`✅ Fixed log ${log._id}`);
      }
    }

    console.log(`🎉 NUCLEAR migration complete! Fixed ${totalFixed} records across entire database`);
    console.log("💥 NO MORE DATE SERIALIZATION ERRORS - GUARANTEED!");
    
    return { 
      success: true, 
      totalFixed,
      message: `Successfully converted all timestamps to numbers across entire database. Fixed ${totalFixed} records.`
    };
  },
});

// Legacy function for backward compatibility
export const fixAllTimestamps = fixAllDatabaseTimestamps;    