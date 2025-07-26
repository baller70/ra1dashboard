import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Utility function to safely get parent data with ID validation
async function safeGetParent(ctx: any, parentId: any) {
  if (!parentId || typeof parentId !== 'string' || parentId.length === 25) {
    return null;
  }
  
  try {
    return await ctx.db.get(parentId as Id<"parents">);
  } catch (error) {
    console.warn(`Failed to get parent with ID ${parentId}:`, error);
    return null;
  }
}

// SCHEDULED MESSAGES QUERIES

export const getScheduledMessages = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    parentId: v.optional(v.id("parents")),
    status: v.optional(v.string()),
    messageType: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, parentId, status, messageType, channel } = args;

    let messagesQuery = ctx.db.query("scheduledMessages");

    if (parentId) {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (status && status !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (messageType && messageType !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("messageType"), messageType));
    }

    if (channel && channel !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("channel"), channel));
    }

    const messages = await messagesQuery.order("desc").collect();

    // Get parent information for each message
    const messagesWithParents = await Promise.all(
      messages.map(async (message) => {
        const parent = await safeGetParent(ctx, message.parentId);
        const template = message.templateId ? await ctx.db.get(message.templateId) : null;
        
        return {
          ...message,
          parent,
          template,
        };
      })
    );

    const offset = (page - 1) * limit;
    const paginatedMessages = messagesWithParents.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: messagesWithParents.length,
        hasMore: offset + limit < messagesWithParents.length,
      },
    };
  },
});

export const getScheduledMessage = query({
  args: { id: v.id("scheduledMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message) return null;

    const parent = await safeGetParent(ctx, message.parentId);
    const template = message.templateId ? await ctx.db.get(message.templateId) : null;
    
    return {
      ...message,
      parent,
      template,
    };
  },
});

export const getDueMessages = query({
  args: {
    beforeTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const beforeTime = args.beforeTime || Date.now();

    const messages = await ctx.db
      .query("scheduledMessages")
      .withIndex("by_due_messages", (q) => 
        q.eq("status", "scheduled").lt("scheduledFor", beforeTime)
      )
      .collect();

    const messagesWithParents = await Promise.all(
      messages.map(async (message) => {
        const parent = await safeGetParent(ctx, message.parentId);
        return {
          ...message,
          parent,
        };
      })
    );

    return messagesWithParents;
  },
});

export const getScheduledMessageStats = query({
  args: {},
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("scheduledMessages").collect();
    const now = Date.now();

    const stats = {
      total: messages.length,
      scheduled: messages.filter(m => m.status === 'scheduled').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      cancelled: messages.filter(m => m.status === 'cancelled').length,
      overdue: messages.filter(m => 
        m.status === 'scheduled' && m.scheduledFor < now
      ).length,
      byChannel: {
        email: messages.filter(m => m.channel === 'email').length,
        sms: messages.filter(m => m.channel === 'sms').length,
      },
      byType: {
        reminder: messages.filter(m => m.messageType === 'reminder').length,
        followup: messages.filter(m => m.messageType === 'followup').length,
        notification: messages.filter(m => m.messageType === 'notification').length,
        custom: messages.filter(m => m.messageType === 'custom').length,
      },
    };

    return stats;
  },
});

// SCHEDULED MESSAGES MUTATIONS

export const createScheduledMessage = mutation({
  args: {
    parentId: v.id("parents"),
    templateId: v.optional(v.id("templates")),
    subject: v.string(),
    body: v.string(),
    channel: v.string(),
    scheduledFor: v.number(),
    messageType: v.string(),
    priority: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const messageId = await ctx.db.insert("scheduledMessages", {
      parentId: args.parentId,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      channel: args.channel,
      scheduledFor: args.scheduledFor,
      status: "scheduled",
      messageType: args.messageType,
      priority: args.priority || "normal",
      retryCount: 0,
      maxRetries: 3,
      metadata: args.metadata,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const updateScheduledMessage = mutation({
  args: {
    id: v.id("scheduledMessages"),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    priority: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const updateMessageStatus = mutation({
  args: {
    id: v.id("scheduledMessages"),
    status: v.string(),
    sentAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message) return null;

    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.sentAt) {
      updateData.sentAt = args.sentAt;
    }

    if (args.failureReason) {
      updateData.failureReason = args.failureReason;
      updateData.retryCount = (message.retryCount || 0) + 1;
    }

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

export const cancelScheduledMessage = mutation({
  args: { id: v.id("scheduledMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteScheduledMessage = mutation({
  args: { id: v.id("scheduledMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// RECURRING MESSAGES QUERIES

export const getRecurringMessages = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    messageType: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, isActive, messageType, channel } = args;

    let messagesQuery = ctx.db.query("recurringMessages");

    if (isActive !== undefined) {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    if (messageType && messageType !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("messageType"), messageType));
    }

    if (channel && channel !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("channel"), channel));
    }

    const messages = await messagesQuery.order("desc").collect();

    const offset = (page - 1) * limit;
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: messages.length,
        hasMore: offset + limit < messages.length,
      },
    };
  },
});

export const getRecurringMessage = query({
  args: { id: v.id("recurringMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message) return null;

    const template = message.templateId ? await ctx.db.get(message.templateId) : null;
    
    // Get recipients
    const recipients = await ctx.db
      .query("recurringRecipients")
      .withIndex("by_recurring_message", (q) => q.eq("recurringMessageId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const recipientsWithParents = await Promise.all(
      recipients.map(async (recipient) => {
        const parent = await safeGetParent(ctx, recipient.parentId);
        return {
          ...recipient,
          parent,
        };
      })
    );
    
    return {
      ...message,
      template,
      recipients: recipientsWithParents,
    };
  },
});

export const getDueRecurringMessages = query({
  args: {
    beforeTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const beforeTime = args.beforeTime || Date.now();

    const messages = await ctx.db
      .query("recurringMessages")
      .withIndex("by_due_recurring", (q) => 
        q.eq("isActive", true).lt("nextRun", beforeTime)
      )
      .collect();

    return messages;
  },
});

// RECURRING MESSAGES MUTATIONS

export const createRecurringMessage = mutation({
  args: {
    parentId: v.optional(v.id("parents")),
    templateId: v.optional(v.id("templates")),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    channel: v.string(),
    messageType: v.string(),
    interval: v.string(),
    intervalValue: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    targetAudience: v.string(),
    audienceFilter: v.optional(v.any()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const messageId = await ctx.db.insert("recurringMessages", {
      parentId: args.parentId,
      templateId: args.templateId,
      name: args.name,
      subject: args.subject,
      body: args.body,
      channel: args.channel,
      messageType: args.messageType,
      interval: args.interval,
      intervalValue: args.intervalValue,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      targetAudience: args.targetAudience,
      audienceFilter: args.audienceFilter,
      nextRun: args.startDate,
      totalSent: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return messageId;
  },
});

export const updateRecurringMessage = mutation({
  args: {
    id: v.id("recurringMessages"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    interval: v.optional(v.string()),
    intervalValue: v.optional(v.number()),
    endDate: v.optional(v.number()),
    targetAudience: v.optional(v.string()),
    audienceFilter: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const pauseRecurringMessage = mutation({
  args: {
    id: v.id("recurringMessages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      pausedAt: Date.now(),
      pausedReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const resumeRecurringMessage = mutation({
  args: { id: v.id("recurringMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: true,
      pausedAt: undefined,
      pausedReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateRecurringNextRun = mutation({
  args: {
    id: v.id("recurringMessages"),
    nextRun: v.number(),
    incrementSentCount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message) return null;

    const updateData: any = {
      nextRun: args.nextRun,
      lastRun: Date.now(),
      updatedAt: Date.now(),
    };

    if (args.incrementSentCount) {
      updateData.totalSent = (message.totalSent || 0) + 1;
    }

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

// RECURRING RECIPIENTS

export const addRecipientToRecurring = mutation({
  args: {
    recurringMessageId: v.id("recurringMessages"),
    parentId: v.id("parents"),
  },
  handler: async (ctx, args) => {
    // Check if recipient already exists
    const existing = await ctx.db
      .query("recurringRecipients")
      .withIndex("by_message_parent", (q) => 
        q.eq("recurringMessageId", args.recurringMessageId).eq("parentId", args.parentId)
      )
      .first();

    if (existing) {
      // Reactivate if was removed
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, {
          isActive: true,
          removedAt: undefined,
        });
      }
      return existing._id;
    }

    const recipientId = await ctx.db.insert("recurringRecipients", {
      recurringMessageId: args.recurringMessageId,
      parentId: args.parentId,
      isActive: true,
      addedAt: Date.now(),
    });

    return recipientId;
  },
});

export const removeRecipientFromRecurring = mutation({
  args: {
    recurringMessageId: v.id("recurringMessages"),
    parentId: v.id("parents"),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db
      .query("recurringRecipients")
      .withIndex("by_message_parent", (q) => 
        q.eq("recurringMessageId", args.recurringMessageId).eq("parentId", args.parentId)
      )
      .first();

    if (recipient) {
      await ctx.db.patch(recipient._id, {
        isActive: false,
        removedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getRecurringRecipients = query({
  args: { recurringMessageId: v.id("recurringMessages") },
  handler: async (ctx, args) => {
    const recipients = await ctx.db
      .query("recurringRecipients")
      .withIndex("by_recurring_message", (q) => q.eq("recurringMessageId", args.recurringMessageId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const recipientsWithParents = await Promise.all(
      recipients.map(async (recipient) => {
        const parent = await safeGetParent(ctx, recipient.parentId);
        return {
          ...recipient,
          parent,
        };
      })
    );

    return recipientsWithParents;
  },
}); 