import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Constants for league fee system
const BASE_FEE_AMOUNT = 95; // $95 base fee
const STRIPE_PROCESSING_FEE_RATE = 0.029; // 2.9%
const STRIPE_FIXED_FEE = 0.30; // $0.30

// Calculate processing fee for online payments
function calculateProcessingFee(amount: number): number {
  return Math.round((amount * STRIPE_PROCESSING_FEE_RATE + STRIPE_FIXED_FEE) * 100) / 100;
}

// Get league fees for a parent
export const getLeagueFeesByParent = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const fees = await ctx.db
      .query("leagueFees")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
    
    // Get season details for each fee
    const feesWithSeasons = await Promise.all(
      fees.map(async (fee) => {
        const season = await ctx.db.get(fee.seasonId);
        return {
          ...fee,
          season,
        };
      })
    );
    
    return feesWithSeasons;
  },
});

// Get league fees for a season
export const getLeagueFeesBySeason = query({
  args: { 
    seasonId: v.id("seasons"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("leagueFees")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    const fees = await query.collect();
    
    // Get parent details for each fee
    const feesWithParents = await Promise.all(
      fees.map(async (fee) => {
        const parent = await ctx.db.get(fee.parentId);
        return {
          ...fee,
          parent,
        };
      })
    );
    
    return feesWithParents;
  },
});

// Get overdue league fees
export const getOverdueLeagueFees = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const overdueFees = await ctx.db
      .query("leagueFees")
      .withIndex("by_overdue", (q) => 
        q.eq("status", "pending").lt("dueDate", now)
      )
      .collect();
    
    // Get parent and season details
    const feesWithDetails = await Promise.all(
      overdueFees.map(async (fee) => {
        const [parent, season] = await Promise.all([
          ctx.db.get(fee.parentId),
          ctx.db.get(fee.seasonId),
        ]);
        return {
          ...fee,
          parent,
          season,
        };
      })
    );
    
    return feesWithDetails;
  },
});

// Create league fee for a parent and season
export const createLeagueFee = mutation({
  args: {
    seasonId: v.id("seasons"),
    parentId: v.id("parents"),
    paymentMethod: v.string(), // "online" or "in_person"
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if fee already exists for this parent and season
    const existingFee = await ctx.db
      .query("leagueFees")
      .withIndex("by_season_parent", (q) => 
        q.eq("seasonId", args.seasonId).eq("parentId", args.parentId)
      )
      .first();
    
    if (existingFee) {
      const seasonName = existingFee?.seasonId ? (await ctx.db.get(existingFee.seasonId))?.name : "this season";
      throw new Error(`League fee already exists for this parent for the ${seasonName || 'current'} season`);
    }
    
    // Get season details
    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }
    
    // Calculate amounts
    const amount = BASE_FEE_AMOUNT;
    let processingFee = 0;
    let totalAmount = amount;
    
    if (args.paymentMethod === "online") {
      processingFee = calculateProcessingFee(amount);
      totalAmount = amount + processingFee;
    }
    
    // Set due date (default to registration deadline or 30 days from now)
    const dueDate = args.dueDate || 
      season.registrationDeadline || 
      (now + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    return await ctx.db.insert("leagueFees", {
      seasonId: args.seasonId,
      parentId: args.parentId,
      amount,
      processingFee: args.paymentMethod === "online" ? processingFee : undefined,
      totalAmount,
      paymentMethod: args.paymentMethod,
      status: "pending",
      dueDate,
      remindersSent: 0,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update league fee status
export const updateLeagueFeeStatus = mutation({
  args: {
    id: v.id("leagueFees"),
    status: v.string(),
    paidAt: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Mark league fee as paid
export const markLeagueFeePaid = mutation({
  args: {
    id: v.id("leagueFees"),
    stripePaymentIntentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.patch(args.id, {
      status: "paid",
      paidAt: now,
      stripePaymentIntentId: args.stripePaymentIntentId,
      notes: args.notes,
      updatedAt: now,
    });
  },
});

// Bulk create league fees for all parents in a season
export const bulkCreateLeagueFees = mutation({
  args: {
    seasonId: v.id("seasons"),
    paymentMethod: v.string(),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all active parents
    const parents = await ctx.db
      .query("parents")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const results = [];
    
    for (const parent of parents) {
      try {
        // Check if fee already exists
        const existingFee = await ctx.db
          .query("leagueFees")
          .withIndex("by_season_parent", (q) => 
            q.eq("seasonId", args.seasonId).eq("parentId", parent._id)
          )
          .first();
        
        if (!existingFee) {
          const feeId = await ctx.db.insert("leagueFees", {
            seasonId: args.seasonId,
            parentId: parent._id,
            amount: BASE_FEE_AMOUNT,
            processingFee: args.paymentMethod === "online" ? 
              calculateProcessingFee(BASE_FEE_AMOUNT) : undefined,
            totalAmount: args.paymentMethod === "online" ? 
              BASE_FEE_AMOUNT + calculateProcessingFee(BASE_FEE_AMOUNT) : 
              BASE_FEE_AMOUNT,
            paymentMethod: args.paymentMethod,
            status: "pending",
            dueDate: args.dueDate || (Date.now() + 30 * 24 * 60 * 60 * 1000),
            remindersSent: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          
          results.push({ parentId: parent._id, feeId, status: "created" });
        } else {
          results.push({ parentId: parent._id, status: "exists" });
        }
      } catch (error) {
        results.push({ 
          parentId: parent._id, 
          status: "error", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
    
    return {
      total: parents.length,
      created: results.filter(r => r.status === "created").length,
      existing: results.filter(r => r.status === "exists").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    };
  },
});

// Increment reminder count
export const incrementReminderCount = mutation({
  args: { id: v.id("leagueFees") },
  handler: async (ctx, args) => {
    const fee = await ctx.db.get(args.id);
    if (!fee) throw new Error("League fee not found");

    return await ctx.db.patch(args.id, {
      remindersSent: fee.remindersSent + 1,
      lastReminderSent: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update overdue status for fees past due date
export const updateOverdueStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all pending fees that are past due
    const overdueFees = await ctx.db
      .query("leagueFees")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("dueDate"), now)
        )
      )
      .collect();

    // Update status to overdue
    const updates = await Promise.all(
      overdueFees.map(fee =>
        ctx.db.patch(fee._id, {
          status: "overdue",
          updatedAt: now,
        })
      )
    );

    return {
      updated: updates.length,
      fees: overdueFees.map(f => f._id),
    };
  },
});

// Get single league fee
export const getLeagueFee = query({
  args: { id: v.id("leagueFees") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update league fee
export const updateLeagueFee = mutation({
  args: {
    id: v.id("leagueFees"),
    stripePaymentLinkId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: updates.updatedAt || Date.now(),
    });
  },
});

// Get league fee statistics
export const getLeagueFeeStats = query({
  args: { seasonId: v.optional(v.id("seasons")) },
  handler: async (ctx, args) => {
    let q1 = ctx.db.query("leagueFees");

    if (args.seasonId) {
      q1 = q1.withIndex("by_season", (q) => q.eq("seasonId", args.seasonId));
    }

    const fees = await q1.collect();

    const stats = {
      total: fees.length,
      paid: fees.filter(f => f.status === "paid").length,
      pending: fees.filter(f => f.status === "pending").length,
      overdue: fees.filter(f => f.status === "overdue").length,
      cancelled: fees.filter(f => f.status === "cancelled").length,
      totalRevenue: fees
        .filter(f => f.status === "paid")
        .reduce((sum, f) => sum + f.totalAmount, 0),
      pendingRevenue: fees
        .filter(f => f.status === "pending" || f.status === "overdue")
        .reduce((sum, f) => sum + f.totalAmount, 0),
      onlinePayments: fees.filter(f => f.paymentMethod === "online").length,
      inPersonPayments: fees.filter(f => f.paymentMethod === "in_person").length,
    };

    return {
      ...stats,
      paymentRate: stats.total > 0 ? (stats.paid / stats.total) * 100 : 0,
    };
  },
});

// Get unpaid (pending or overdue) league fees with joined parent+season
export const getUnpaidLeagueFees = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("leagueFees")
      .filter((q) => q.or(
        q.eq(q.field("status"), "pending"),
        q.eq(q.field("status"), "overdue")
      ))
      .collect();

    const withJoins = await Promise.all(
      all.map(async (fee) => {
        const [parent, season] = await Promise.all([
          ctx.db.get(fee.parentId),
          ctx.db.get(fee.seasonId),
        ]);
        return { ...fee, parent, season };
      })
    );

    return withJoins;
  },
});
