import { mutation, query } from "convex/server";
import { v } from "convex/values";

// seasons.listSeasons
export const listSeasons = query({
  args: { withStats: v.optional(v.boolean()) },
  handler: async (ctx, { withStats }) => {
    const seasons = await ctx.db
      .query("seasons")
      .withIndex("by_year")
      .collect();

    // Sort by createdAt desc (newest first)
    seasons.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    if (!withStats) return seasons;

    // Stats not yet implemented (league fees mocked via API route).
    // Return seasons with empty stats fields for compatibility.
    return seasons.map((s) => ({
      ...s,
      stats: {
        totalFees: 0,
        paidFees: 0,
        pendingFees: 0,
        overdueFees: 0,
        totalRevenue: 0,
        paymentRate: 0,
      },
    }));
  },
});

// seasons.createSeason
export const createSeason = mutation({
  args: {
    name: v.string(),
    type: v.string(), // 'summer_league' | 'fall_tournament'
    year: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    registrationDeadline: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("seasons", {
      name: args.name,
      type: args.type,
      year: args.year,
      startDate: args.startDate,
      endDate: args.endDate,
      registrationDeadline: args.registrationDeadline,
      isActive: true,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  },
});

// seasons.updateSeason
export const updateSeason = mutation({
  args: {
    id: v.id("seasons"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    year: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Season not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return { id };
  },
});

// seasons.deleteSeason
export const deleteSeason = mutation({
  args: { id: v.id("seasons") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { id };
  },
});

