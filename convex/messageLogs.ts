// @ts-nocheck
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ENHANCED MESSAGE LOGS QUERIES

// Add alias for backward compatibility
export const list = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    parentId: v.optional(v.string()),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    channel: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, parentId, status, type, channel, dateFrom, dateTo } = args;

    let messagesQuery = ctx.db.query("messageLogs");

    if (parentId) {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (status && status !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (type && type !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("type"), type));
    }

    if (channel && channel !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("channel"), channel));
    }

    if (dateFrom) {
      messagesQuery = messagesQuery.filter((q) => q.gte(q.field("sentAt"), dateFrom));
    }

    if (dateTo) {
      messagesQuery = messagesQuery.filter((q) => q.lte(q.field("sentAt"), dateTo));
    }

    const messages = await messagesQuery.order("desc").collect();

    const messagesWithDetails = await Promise.all(
      messages.map(async (message) => {
        try {
          const parent = await ctx.db
            .query("parents")
            .filter((q) => q.eq(q.field("_id"), message.parentId))
            .first();

          return {
            ...message,
            parent,
          };
        } catch (error) {
          return {
            ...message,
            parent: null,
          };
        }
      })
    );

    const offset = (page - 1) * limit;
    const paginatedMessages = messagesWithDetails.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: messagesWithDetails.length,
        hasMore: offset + limit < messagesWithDetails.length,
      },
    };
  }
});

export const getMessageLogs = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    parentId: v.optional(v.string()),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    channel: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, parentId, status, type, channel, dateFrom, dateTo } = args;

    let messagesQuery = ctx.db.query("messageLogs");

    if (parentId) {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (status && status !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (type && type !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("type"), type));
    }

    if (channel && channel !== 'all') {
      messagesQuery = messagesQuery.filter((q) => q.eq(q.field("channel"), channel));
    }

    if (dateFrom) {
      messagesQuery = messagesQuery.filter((q) => q.gte(q.field("sentAt"), dateFrom));
    }

    if (dateTo) {
      messagesQuery = messagesQuery.filter((q) => q.lte(q.field("sentAt"), dateTo));
    }

    const messages = await messagesQuery.order("desc").collect();

    // Get parent information and analytics for each message
    const messagesWithDetails = await Promise.all(
      messages.map(async (message) => {
        const parent = await ctx.db
          .query("parents")
          .filter((q) => q.eq(q.field("_id"), message.parentId))
          .first();

        const analytics = await ctx.db
          .query("messageAnalytics")
          .withIndex("by_message", (q) => q.eq("messageLogId", message._id))
          .first();

        const attachments = await ctx.db
          .query("messageAttachments")
          .withIndex("by_message", (q) => q.eq("messageLogId", message._id))
          .collect();
        
        return {
          ...message,
          parent,
          analytics,
          attachments,
        };
      })
    );

    const offset = (page - 1) * limit;
    const paginatedMessages = messagesWithDetails.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: messagesWithDetails.length,
        hasMore: offset + limit < messagesWithDetails.length,
      },
    };
  },
});

export const getMessageLog = query({
  args: { id: v.id("messageLogs") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (!message) return null;

    const parent = await ctx.db
      .query("parents")
      .filter((q) => q.eq(q.field("_id"), message.parentId))
      .first();

    const analytics = await ctx.db
      .query("messageAnalytics")
      .withIndex("by_message", (q) => q.eq("messageLogId", args.id))
      .first();

    const attachments = await ctx.db
      .query("messageAttachments")
      .withIndex("by_message", (q) => q.eq("messageLogId", args.id))
      .collect();
    
    return {
      ...message,
      parent,
      analytics,
      attachments,
    };
  },
});

export const getMessagesByParent = query({
  args: { 
    parentId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { parentId, limit = 50 } = args;

    const messages = await ctx.db
      .query("messageLogs")
      .withIndex("by_parent", (q) => q.eq("parentId", parentId))
      .order("desc")
      .take(limit);

    const messagesWithAnalytics = await Promise.all(
      messages.map(async (message) => {
        const analytics = await ctx.db
          .query("messageAnalytics")
          .withIndex("by_message", (q) => q.eq("messageLogId", message._id))
          .first();
        
        return {
          ...message,
          analytics,
        };
      })
    );

    return messagesWithAnalytics;
  },
});

export const getMessageStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let messagesQuery = ctx.db.query("messageLogs");

    if (args.dateFrom) {
      messagesQuery = messagesQuery.filter((q) => q.gte(q.field("sentAt"), args.dateFrom));
    }

    if (args.dateTo) {
      messagesQuery = messagesQuery.filter((q) => q.lte(q.field("sentAt"), args.dateTo));
    }

    const messages = await messagesQuery.collect();
    const analytics = await ctx.db.query("messageAnalytics").collect();

    const stats = {
      total: messages.length,
      sent: messages.filter(m => m.status === 'sent').length,
      delivered: messages.filter(m => m.status === 'delivered').length,
      failed: messages.filter(m => m.status === 'failed').length,
      byChannel: {
        email: messages.filter(m => m.channel === 'email').length,
        sms: messages.filter(m => m.channel === 'sms').length,
      },
      byType: {
        payment_reminder: messages.filter(m => m.type === 'payment_reminder').length,
        contract_followup: messages.filter(m => m.type === 'contract_followup').length,
        general: messages.filter(m => m.type === 'general').length,
      },
      engagement: {
        totalOpened: analytics.filter(a => a.opened).length,
        totalClicked: analytics.filter(a => a.clicked).length,
        totalReplied: analytics.filter(a => a.replied).length,
        openRate: messages.length > 0 ? Math.round((analytics.filter(a => a.opened).length / messages.length) * 100) : 0,
        clickRate: messages.length > 0 ? Math.round((analytics.filter(a => a.clicked).length / messages.length) * 100) : 0,
        replyRate: messages.length > 0 ? Math.round((analytics.filter(a => a.replied).length / messages.length) * 100) : 0,
      },
    };

    return stats;
  },
});

// MESSAGE LOGS MUTATIONS

export const createMessageLog = mutation({
  args: {
    parentId: v.string(),
    templateId: v.optional(v.string()),
    subject: v.string(),
    body: v.optional(v.string()),
    content: v.optional(v.string()),
    channel: v.optional(v.string()),
    type: v.optional(v.string()),
    status: v.string(),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const messageId = await ctx.db.insert("messageLogs", {
      parentId: args.parentId,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body || args.content,
      content: args.content || args.body,
      channel: args.channel || 'email',
      type: args.type || 'general',
      status: args.status,
      sentAt: args.sentAt || now,
      deliveredAt: args.deliveredAt,
      failureReason: args.failureReason,
      metadata: args.metadata,
      createdAt: now,
    });

    return messageId;
  },
});

export const updateMessageStatus = mutation({
  args: {
    id: v.id("messageLogs"),
    status: v.string(),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.any()),
    failureReason: v.optional(v.string()),
    errorMessage: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, updates);
    return id;
  },
});

// MESSAGE THREADS

export const getMessageThreads = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    parentId: v.optional(v.id("parents")),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, parentId, type, status } = args;

    let threadsQuery = ctx.db.query("messageThreads");

    if (parentId) {
      threadsQuery = threadsQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (type && type !== 'all') {
      threadsQuery = threadsQuery.filter((q) => q.eq(q.field("type"), type));
    }

    if (status && status !== 'all') {
      threadsQuery = threadsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    const threads = await threadsQuery.order("desc").collect();

    const threadsWithParents = await Promise.all(
      threads.map(async (thread) => {
        const parent = await ctx.db.get(thread.parentId);
        return {
          ...thread,
          parent,
        };
      })
    );

    const offset = (page - 1) * limit;
    const paginatedThreads = threadsWithParents.slice(offset, offset + limit);

    return {
      threads: paginatedThreads,
      pagination: {
        page,
        limit,
        total: threadsWithParents.length,
        hasMore: offset + limit < threadsWithParents.length,
      },
    };
  },
});

export const createMessageThread = mutation({
  args: {
    parentId: v.id("parents"),
    subject: v.string(),
    type: v.string(),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const threadId = await ctx.db.insert("messageThreads", {
      parentId: args.parentId,
      subject: args.subject,
      type: args.type,
      status: "active",
      priority: args.priority || "normal",
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

export const updateMessageThread = mutation({
  args: {
    id: v.id("messageThreads"),
    status: v.optional(v.string()),
    messageCount: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.status === 'resolved') {
      updateData.resolvedAt = Date.now();
    }

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// MESSAGE ATTACHMENTS

export const addMessageAttachment = mutation({
  args: {
    messageLogId: v.id("messageLogs"),
    fileName: v.string(),
    originalName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const attachmentId = await ctx.db.insert("messageAttachments", {
      messageLogId: args.messageLogId,
      fileName: args.fileName,
      originalName: args.originalName,
      fileUrl: args.fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedAt: Date.now(),
    });

    return attachmentId;
  },
});

export const getMessageAttachments = query({
  args: { messageLogId: v.id("messageLogs") },
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("messageAttachments")
      .withIndex("by_message", (q) => q.eq("messageLogId", args.messageLogId))
      .collect();

    return attachments;
  },
});

// MESSAGE ANALYTICS

export const createMessageAnalytics = mutation({
  args: {
    messageLogId: v.id("messageLogs"),
    parentId: v.id("parents"),
    channel: v.string(),
    messageType: v.string(),
    deviceType: v.optional(v.string()),
    location: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analyticsId = await ctx.db.insert("messageAnalytics", {
      messageLogId: args.messageLogId,
      parentId: args.parentId,
      channel: args.channel,
      messageType: args.messageType,
      opened: false,
      clicked: false,
      replied: false,
      bounced: false,
      unsubscribed: false,
      deviceType: args.deviceType,
      location: args.location,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return analyticsId;
  },
});

export const updateMessageAnalytics = mutation({
  args: {
    messageLogId: v.id("messageLogs"),
    opened: v.optional(v.boolean()),
    clicked: v.optional(v.boolean()),
    replied: v.optional(v.boolean()),
    bounced: v.optional(v.boolean()),
    unsubscribed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("messageAnalytics")
      .withIndex("by_message", (q) => q.eq("messageLogId", args.messageLogId))
      .first();

    if (!analytics) return null;

    const now = Date.now();
    const updateData: any = {};

    if (args.opened !== undefined) {
      updateData.opened = args.opened;
      if (args.opened) updateData.openedAt = now;
    }

    if (args.clicked !== undefined) {
      updateData.clicked = args.clicked;
      if (args.clicked) updateData.clickedAt = now;
    }

    if (args.replied !== undefined) {
      updateData.replied = args.replied;
      if (args.replied) updateData.repliedAt = now;
    }

    if (args.bounced !== undefined) {
      updateData.bounced = args.bounced;
      if (args.bounced) updateData.bouncedAt = now;
    }

    if (args.unsubscribed !== undefined) {
      updateData.unsubscribed = args.unsubscribed;
      if (args.unsubscribed) updateData.unsubscribedAt = now;
    }

    await ctx.db.patch(analytics._id, updateData);
    return analytics._id;
  },
});

export const getMessageAnalytics = query({
  args: { messageLogId: v.id("messageLogs") },
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("messageAnalytics")
      .withIndex("by_message", (q) => q.eq("messageLogId", args.messageLogId))
      .first();

    return analytics;
  },
});

export const getEngagementStats = query({
  args: {
    parentId: v.optional(v.id("parents")),
    channel: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let analyticsQuery = ctx.db.query("messageAnalytics");

    if (args.parentId) {
      analyticsQuery = analyticsQuery.filter((q) => q.eq(q.field("parentId"), args.parentId));
    }

    if (args.channel && args.channel !== 'all') {
      analyticsQuery = analyticsQuery.filter((q) => q.eq(q.field("channel"), args.channel));
    }

    if (args.dateFrom) {
      analyticsQuery = analyticsQuery.filter((q) => q.gte(q.field("createdAt"), args.dateFrom));
    }

    if (args.dateTo) {
      analyticsQuery = analyticsQuery.filter((q) => q.lte(q.field("createdAt"), args.dateTo));
    }

    const analytics = await analyticsQuery.collect();

    const stats = {
      total: analytics.length,
      opened: analytics.filter(a => a.opened).length,
      clicked: analytics.filter(a => a.clicked).length,
      replied: analytics.filter(a => a.replied).length,
      bounced: analytics.filter(a => a.bounced).length,
      unsubscribed: analytics.filter(a => a.unsubscribed).length,
      openRate: analytics.length > 0 ? Math.round((analytics.filter(a => a.opened).length / analytics.length) * 100) : 0,
      clickRate: analytics.length > 0 ? Math.round((analytics.filter(a => a.clicked).length / analytics.length) * 100) : 0,
      replyRate: analytics.length > 0 ? Math.round((analytics.filter(a => a.replied).length / analytics.length) * 100) : 0,
      bounceRate: analytics.length > 0 ? Math.round((analytics.filter(a => a.bounced).length / analytics.length) * 100) : 0,
      unsubscribeRate: analytics.length > 0 ? Math.round((analytics.filter(a => a.unsubscribed).length / analytics.length) * 100) : 0,
    };

    return stats;
  },
});

// Get recent messages for notifications
export const getRecentMessages = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const messages = await ctx.db
      .query("messageLogs")
      .order("desc")
      .take(limit);

    return messages;
  },
}); 