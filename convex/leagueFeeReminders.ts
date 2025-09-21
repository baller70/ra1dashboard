import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Reminder schedule configuration (in days)
const REMINDER_SCHEDULE = {
  initial: 0, // Send immediately when fee is created
  first_reminder: 7, // 7 days before due date
  second_reminder: 3, // 3 days before due date
  final_notice: 1, // 1 day after due date
};

// Get reminders for a league fee
export const getRemindersByLeagueFee = query({
  args: { leagueFeeId: v.id("leagueFees") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leagueFeeReminders")
      .withIndex("by_league_fee", (q) => q.eq("leagueFeeId", args.leagueFeeId))
      .order("desc")
      .collect();
  },
});

// Get pending reminders that need to be sent
export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    return await ctx.db
      .query("leagueFeeReminders")
      .withIndex("by_due_reminders", (q) => 
        q.eq("status", "scheduled").lte("scheduledFor", now)
      )
      .collect();
  },
});

// Create reminder schedule for a league fee
export const createReminderSchedule = mutation({
  args: { leagueFeeId: v.id("leagueFees") },
  handler: async (ctx, args) => {
    const fee = await ctx.db.get(args.leagueFeeId);
    if (!fee) throw new Error("League fee not found");
    
    const now = Date.now();
    const dueDate = fee.dueDate;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    const reminders = [];
    
    // Schedule initial reminder (immediate)
    reminders.push({
      leagueFeeId: args.leagueFeeId,
      parentId: fee.parentId,
      seasonId: fee.seasonId,
      reminderType: "initial" as const,
      scheduledFor: now,
      status: "scheduled" as const,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    // Schedule first reminder (7 days before due)
    const firstReminderDate = dueDate - (REMINDER_SCHEDULE.first_reminder * dayInMs);
    if (firstReminderDate > now) {
      reminders.push({
        leagueFeeId: args.leagueFeeId,
        parentId: fee.parentId,
        seasonId: fee.seasonId,
        reminderType: "first_reminder" as const,
        scheduledFor: firstReminderDate,
        status: "scheduled" as const,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Schedule second reminder (3 days before due)
    const secondReminderDate = dueDate - (REMINDER_SCHEDULE.second_reminder * dayInMs);
    if (secondReminderDate > now) {
      reminders.push({
        leagueFeeId: args.leagueFeeId,
        parentId: fee.parentId,
        seasonId: fee.seasonId,
        reminderType: "second_reminder" as const,
        scheduledFor: secondReminderDate,
        status: "scheduled" as const,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Schedule final notice (1 day after due)
    const finalNoticeDate = dueDate + (REMINDER_SCHEDULE.final_notice * dayInMs);
    reminders.push({
      leagueFeeId: args.leagueFeeId,
      parentId: fee.parentId,
      seasonId: fee.seasonId,
      reminderType: "final_notice" as const,
      scheduledFor: finalNoticeDate,
      status: "scheduled" as const,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    // Insert all reminders
    const reminderIds = await Promise.all(
      reminders.map(reminder => ctx.db.insert("leagueFeeReminders", reminder))
    );
    
    return {
      created: reminderIds.length,
      reminderIds,
    };
  },
});

// Mark reminder as sent
export const markReminderSent = mutation({
  args: {
    id: v.id("leagueFeeReminders"),
    messageLogId: v.optional(v.id("messageLogs")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.patch(args.id, {
      status: "sent",
      sentAt: now,
      messageLogId: args.messageLogId,
      updatedAt: now,
    });
  },
});

// Mark reminder as failed
export const markReminderFailed = mutation({
  args: {
    id: v.id("leagueFeeReminders"),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.id);
    if (!reminder) throw new Error("Reminder not found");
    
    const now = Date.now();
    
    return await ctx.db.patch(args.id, {
      status: "failed",
      failureReason: args.failureReason,
      retryCount: reminder.retryCount + 1,
      updatedAt: now,
    });
  },
});

// Cancel all reminders for a league fee (when paid)
export const cancelRemindersForLeagueFee = mutation({
  args: { leagueFeeId: v.id("leagueFees") },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("leagueFeeReminders")
      .withIndex("by_league_fee", (q) => q.eq("leagueFeeId", args.leagueFeeId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    
    const updates = await Promise.all(
      reminders.map(reminder => 
        ctx.db.patch(reminder._id, {
          status: "cancelled",
          updatedAt: Date.now(),
        })
      )
    );
    
    return {
      cancelled: updates.length,
      reminderIds: reminders.map(r => r._id),
    };
  },
});

// Process pending reminders (to be called by cron job)
export const processPendingReminders = action({
  args: {},
  handler: async (ctx) => {
    const pendingReminders = await ctx.runQuery(internal.leagueFeeReminders.getPendingReminders);
    
    const results = [];
    
    for (const reminder of pendingReminders) {
      try {
        // Get league fee and parent details
        const [fee, parent, season] = await Promise.all([
          ctx.runQuery(internal.leagueFees.getLeagueFee, { id: reminder.leagueFeeId }),
          ctx.runQuery(internal.parents.getParent, { id: reminder.parentId }),
          ctx.runQuery(internal.seasons.getSeason, { id: reminder.seasonId }),
        ]);
        
        if (!fee || !parent || !season) {
          await ctx.runMutation(internal.leagueFeeReminders.markReminderFailed, {
            id: reminder._id,
            failureReason: "Missing fee, parent, or season data",
          });
          continue;
        }
        
        // Skip if fee is already paid
        if (fee.status === "paid") {
          await ctx.runMutation(internal.leagueFeeReminders.cancelRemindersForLeagueFee, {
            leagueFeeId: fee._id,
          });
          continue;
        }
        
        // Send reminder message
        const messageResult = await ctx.runAction(internal.leagueFeeReminders.sendReminderMessage, {
          reminder,
          fee,
          parent,
          season,
        });
        
        if (messageResult.success) {
          await ctx.runMutation(internal.leagueFeeReminders.markReminderSent, {
            id: reminder._id,
            messageLogId: messageResult.messageLogId,
          });
          
          // Increment reminder count on league fee
          await ctx.runMutation(internal.leagueFees.incrementReminderCount, {
            id: fee._id,
          });
          
          results.push({ reminderId: reminder._id, status: "sent" });
        } else {
          await ctx.runMutation(internal.leagueFeeReminders.markReminderFailed, {
            id: reminder._id,
            failureReason: messageResult.error || "Unknown error",
          });
          
          results.push({ reminderId: reminder._id, status: "failed" });
        }
      } catch (error) {
        await ctx.runMutation(internal.leagueFeeReminders.markReminderFailed, {
          id: reminder._id,
          failureReason: error instanceof Error ? error.message : "Unknown error",
        });
        
        results.push({ reminderId: reminder._id, status: "error" });
      }
    }
    
    return {
      processed: results.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    };
  },
});

// Send reminder message (internal action)
export const sendReminderMessage = action({
  args: {
    reminder: v.any(),
    fee: v.any(),
    parent: v.any(),
    season: v.any(),
  },
  handler: async (ctx, args) => {
    // This will be implemented when we create the message sending functionality
    // For now, return a placeholder
    return {
      success: true,
      messageLogId: undefined,
    };
  },
});

// Get pending reminders (internal query)
export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    return await ctx.db
      .query("leagueFeeReminders")
      .withIndex("by_due_reminders", (q) =>
        q.eq("status", "scheduled").lte("scheduledFor", now)
      )
      .collect();
  },
});
