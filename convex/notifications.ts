// @ts-nocheck
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get notifications for a user (or all notifications if no userId)
export const getNotifications = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
    type: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const includeRead = args.includeRead !== false; // Default to true

    let query = ctx.db.query("notifications");

    // Filter by user if provided
    if (args.userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    let notifications = await query.order("desc").take(limit * 2); // Take more to filter

    // Apply additional filters
    notifications = notifications.filter(notification => {
      // FILTER OUT TEST/SAMPLE DATA
      if (notification.metadata && (notification.metadata as any).sample === true) return false;
      
      // Filter by read status
      if (!includeRead && notification.isRead) return false;
      
      // Filter by type
      if (args.type && notification.type !== args.type) return false;
      
      // Filter by priority
      if (args.priority && notification.priority !== args.priority) return false;
      
      // Filter out expired notifications
      if (notification.expiresAt && notification.expiresAt < Date.now()) return false;
      
      return true;
    });

    // Limit results
    notifications = notifications.slice(0, limit);

    // Enrich with related data
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let parent = null;
        let payment = null;
        let contract = null;

        if (notification.parentId) {
          parent = await ctx.db.get(notification.parentId);
        }
        if (notification.paymentId) {
          payment = await ctx.db.get(notification.paymentId);
        }
        if (notification.contractId) {
          contract = await ctx.db.get(notification.contractId);
        }

        return {
          ...notification,
          parent,
          payment,
          contract,
        };
      })
    );

    return enrichedNotifications;
  },
});

// Get notification counts by status
export const getNotificationCounts = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("notifications");

    if (args.userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    const notifications = await query.collect();

    // Filter out expired notifications
    const activeNotifications = notifications.filter(n => 
      !n.expiresAt || n.expiresAt > Date.now()
    );

    const counts = {
      total: activeNotifications.length,
      unread: activeNotifications.filter(n => !n.isRead).length,
      high: activeNotifications.filter(n => n.priority === 'high' && !n.isRead).length,
      urgent: activeNotifications.filter(n => n.priority === 'urgent' && !n.isRead).length,
      byType: {} as Record<string, number>,
    };

    // Count by type
    activeNotifications.forEach(notification => {
      if (!notification.isRead) {
        counts.byType[notification.type] = (counts.byType[notification.type] || 0) + 1;
      }
    });

    return counts;
  },
});

// Create a new notification
export const createNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.string(),
    priority: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    parentId: v.optional(v.id("parents")),
    paymentId: v.optional(v.id("payments")),
    contractId: v.optional(v.id("contracts")),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    metadata: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const notificationId = await ctx.db.insert("notifications", {
      title: args.title,
      message: args.message,
      type: args.type,
      priority: args.priority || "medium",
      isRead: false,
      userId: args.userId,
      parentId: args.parentId,
      paymentId: args.paymentId,
      contractId: args.contractId,
      actionUrl: args.actionUrl,
      actionText: args.actionText,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });

    return notificationId;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
      updatedAt: Date.now(),
    });
    
    return args.notificationId;
  },
});

// Mark multiple notifications as read
export const markMultipleAsRead = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await Promise.all(
      args.notificationIds.map(id =>
        ctx.db.patch(id, {
          isRead: true,
          updatedAt: now,
        })
      )
    );
    
    return args.notificationIds;
  },
});

// Mark all notifications as read for a user
export const markAllAsRead = mutation({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("notifications");

    if (args.userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    const notifications = await query
      .withIndex("by_read_status", (q) => q.eq("isRead", false))
      .collect();

    const now = Date.now();
    
    await Promise.all(
      notifications.map(notification =>
        ctx.db.patch(notification._id, {
          isRead: true,
          updatedAt: now,
        })
      )
    );
    
    return notifications.length;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
    return args.notificationId;
  },
});

// Clean up expired notifications
export const cleanupExpiredNotifications = mutation({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const expiredNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_expires_at")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    await Promise.all(
      expiredNotifications.map(notification =>
        ctx.db.delete(notification._id)
      )
    );
    
    return expiredNotifications.length;
  },
});

// Generate sample notifications for testing
export const generateSampleNotifications = mutation({
  args: {
    userId: v.optional(v.id("users")),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const count = args.count || 5;
    const now = Date.now();
    
    const sampleNotifications = [
      {
        title: "Payment Overdue",
        message: "Payment for Sarah Chen is 3 days overdue",
        type: "payment_overdue",
        priority: "high",
        actionUrl: "/payments",
        actionText: "View Payment",
      },
      {
        title: "New Payment Received",
        message: "John Smith has made a payment of $500",
        type: "payment_received",
        priority: "medium",
        actionUrl: "/payments",
        actionText: "View Details",
      },
      {
        title: "Contract Expiring Soon",
        message: "Contract for Mike Johnson expires in 7 days",
        type: "contract_expiring",
        priority: "medium",
        actionUrl: "/contracts",
        actionText: "Renew Contract",
      },
      {
        title: "System Maintenance",
        message: "Scheduled maintenance will occur tonight at 2 AM",
        type: "system_alert",
        priority: "low",
        actionUrl: "/settings",
        actionText: "Learn More",
      },
      {
        title: "Urgent: Multiple Overdue Payments",
        message: "5 payments are now more than 7 days overdue",
        type: "payment_overdue",
        priority: "urgent",
        actionUrl: "/payments/overdue",
        actionText: "Take Action",
      },
    ];

    const createdIds = [];
    
    for (let i = 0; i < count; i++) {
      const notification = sampleNotifications[i % sampleNotifications.length];
      
      const id = await ctx.db.insert("notifications", {
        ...notification,
        userId: args.userId,
        isRead: Math.random() > 0.7, // 30% chance of being read
        createdAt: now - (i * 60000), // Stagger creation times
        updatedAt: now - (i * 60000),
        metadata: {
          sample: true,
          index: i,
        },
      });
      
      createdIds.push(id);
    }
    
    return createdIds;
  },
}); 