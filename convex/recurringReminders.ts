import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRecurringReminderSchedule = mutation({
  args: {
    parentId: v.id("parents"),
    installmentIds: v.array(v.string()),
    combinedTotal: v.number(),
    frequencyValue: v.number(),
    frequencyUnit: v.string(),
    stopOnPayment: v.boolean(),
    stopOnReply: v.boolean(),
    maxReminders: v.number(),
    stripeSessionId: v.optional(v.string()),
    stripeLink: v.optional(v.string()),
    paymentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nextSendAt =
      args.frequencyUnit === "weeks"
        ? now + args.frequencyValue * 7 * 24 * 60 * 60 * 1000
        : now + args.frequencyValue * 24 * 60 * 60 * 1000;

    const scheduleId = await ctx.db.insert("recurringReminders", {
      parentId: args.parentId,
      installmentIds: args.installmentIds,
      combinedTotal: args.combinedTotal,
      frequencyValue: args.frequencyValue,
      frequencyUnit: args.frequencyUnit,
      stopOnPayment: args.stopOnPayment,
      stopOnReply: args.stopOnReply,
      maxReminders: args.maxReminders,
      sentCount: 0,
      lastSentAt: null,
      nextSendAt,
      isActive: true,
      stripeSessionId: args.stripeSessionId,
      stripeLink: args.stripeLink,
      paymentId: args.paymentId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, scheduleId, nextSendAt };
  },
});

export const getDueRecurringReminders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 50;
    return await ctx.db
      .query("recurringReminders")
      .withIndex("by_active_nextSendAt", (q) => q.eq("isActive", true).lte("nextSendAt", now))
      .order("nextSendAt", "asc")
      .take(limit);
  },
});

export const logRecurringReminder = mutation({
  args: {
    scheduleId: v.id("recurringReminders"),
    parentId: v.id("parents"),
    installmentIds: v.array(v.string()),
    amount: v.number(),
    status: v.string(),
    error: v.optional(v.string()),
    messageId: v.optional(v.string()),
    stripeLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("recurringReminderLogs", {
      scheduleId: args.scheduleId,
      parentId: args.parentId,
      installmentIds: args.installmentIds,
      amount: args.amount,
      sentAt: now,
      status: args.status,
      error: args.error,
      messageId: args.messageId,
      stripeLink: args.stripeLink,
    });
    return { success: true };
  },
});

export const updateRecurringReminderProgress = mutation({
  args: {
    scheduleId: v.id("recurringReminders"),
    sent: v.boolean(),
    frequencyValue: v.optional(v.number()),
    frequencyUnit: v.optional(v.string()),
    stopOnPayment: v.optional(v.boolean()),
    stopOnReply: v.optional(v.boolean()),
    maxReminders: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) return { success: false, error: "Schedule not found" };

    const now = Date.now();
    let sentCount = schedule.sentCount;
    let nextSendAt = schedule.nextSendAt;

    if (args.sent) {
      sentCount += 1;
      const freqValue = args.frequencyValue ?? schedule.frequencyValue;
      const freqUnit = args.frequencyUnit ?? schedule.frequencyUnit;
      nextSendAt =
        freqUnit === "weeks"
          ? now + freqValue * 7 * 24 * 60 * 60 * 1000
          : now + freqValue * 24 * 60 * 60 * 1000;
    }

    await ctx.db.patch(args.scheduleId, {
      sentCount,
      nextSendAt,
      updatedAt: now,
      stopOnPayment: args.stopOnPayment ?? schedule.stopOnPayment,
      stopOnReply: args.stopOnReply ?? schedule.stopOnReply,
      maxReminders: args.maxReminders ?? schedule.maxReminders,
      isActive: args.isActive ?? schedule.isActive,
    });

    return { success: true, sentCount, nextSendAt };
  },
});

export const updateSchedulesForPaid = mutation({
  args: {
    installmentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const toUpdate = await ctx.db
      .query("recurringReminders")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const targetSet = new Set(args.installmentIds.map((s) => String(s)));
    let updated = 0;
    for (const sched of toUpdate) {
      const overlap = (sched.installmentIds || []).some((id: string) =>
        targetSet.has(String(id))
      );
      if (overlap) {
        await ctx.db.patch(sched._id, { isActive: false, updatedAt: Date.now() });
        updated += 1;
      }
    }
    return { success: true, updated };
  },
});

