import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const BASE_FEE_AMOUNT = 150;

export const getTournamentFeesByParent = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const fees = await ctx.db
      .query("tournamentFees")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();

    const feesWithSeasons = await Promise.all(
      fees.map(async (fee) => {
        const season = await ctx.db.get(fee.seasonId);
        return { ...fee, season };
      })
    );
    return feesWithSeasons;
  },
});

export const createTournamentFee = mutation({
  args: {
    seasonId: v.id("seasons"),
    parentId: v.id("parents"),
    paymentMethod: v.string(),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tournamentFees")
      .withIndex("by_season_parent", (q) => q.eq("seasonId", args.seasonId).eq("parentId", args.parentId))
      .first();
    if (existing) {
      const season = await ctx.db.get(args.seasonId);
      const seasonName = season?.name || "this season";
      throw new Error(`Tournament fee already exists for this parent for the ${seasonName} season`);
    }

    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");

    const amount = args.amount ?? BASE_FEE_AMOUNT;
    const processingFee = args.paymentMethod === "online" ? Math.round((amount * 0.029 + 0.3) * 100) / 100 : 0;
    const totalAmount = amount + processingFee;
    const dueDate = args.dueDate || season.registrationDeadline || now + 30 * 24 * 60 * 60 * 1000;

    const feeId = await ctx.db.insert("tournamentFees", {
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

    return feeId;
  },
});

export const updateTournamentFeeStatus = mutation({
  args: {
    id: v.id("tournamentFees"),
    status: v.string(),
    paidAt: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});







