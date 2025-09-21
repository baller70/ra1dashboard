import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all seasons
export const getSeasons = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let seasonsQuery = ctx.db.query("seasons");
    
    if (!args.includeInactive) {
      seasonsQuery = seasonsQuery.filter((q) => q.eq(q.field("isActive"), true));
    }
    
    const seasons = await seasonsQuery
      .order("desc")
      .collect();
    
    return seasons;
  },
});

// Get season by ID
export const getSeason = query({
  args: { id: v.id("seasons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get current active seasons
export const getActiveSeasons = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("seasons")
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), true),
          q.lte(q.field("startDate"), now),
          q.gte(q.field("endDate"), now)
        )
      )
      .collect();
  },
});

// Get seasons by type and year
export const getSeasonsByTypeAndYear = query({
  args: {
    type: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seasons")
      .withIndex("by_type_year", (q) => 
        q.eq("type", args.type).eq("year", args.year)
      )
      .collect();
  },
});

// Create a new season
export const createSeason = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    year: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    registrationDeadline: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if season with same type and year already exists
    const existingSeason = await ctx.db
      .query("seasons")
      .withIndex("by_type_year", (q) => 
        q.eq("type", args.type).eq("year", args.year)
      )
      .first();
    
    if (existingSeason) {
      throw new Error(`Season of type ${args.type} for year ${args.year} already exists`);
    }
    
    return await ctx.db.insert("seasons", {
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
  },
});

// Update season
export const updateSeason = mutation({
  args: {
    id: v.id("seasons"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});



// Delete season (only if no league fees exist)
export const deleteSeason = mutation({
  args: { id: v.id("seasons") },
  handler: async (ctx, args) => {
    // Check if any league fees exist for this season
    const existingFees = await ctx.db
      .query("leagueFees")
      .withIndex("by_season", (q) => q.eq("seasonId", args.id))
      .first();

    if (existingFees) {
      throw new Error("Cannot delete season with existing league fees");
    }

    return await ctx.db.delete(args.id);
  },
});

// Get seasons with fee statistics
export const getSeasonsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db.query("seasons").order("desc").collect();
    
    const seasonsWithStats = await Promise.all(
      seasons.map(async (season) => {
        const fees = await ctx.db
          .query("leagueFees")
          .withIndex("by_season", (q) => q.eq("seasonId", season._id))
          .collect();
        
        const totalFees = fees.length;
        const paidFees = fees.filter(f => f.status === "paid").length;
        const pendingFees = fees.filter(f => f.status === "pending").length;
        const overdueFees = fees.filter(f => f.status === "overdue").length;
        const totalRevenue = fees
          .filter(f => f.status === "paid")
          .reduce((sum, f) => sum + f.totalAmount, 0);
        
        return {
          ...season,
          stats: {
            totalFees,
            paidFees,
            pendingFees,
            overdueFees,
            totalRevenue,
            paymentRate: totalFees > 0 ? (paidFees / totalFees) * 100 : 0,
          },
        };
      })
    );
    
    return seasonsWithStats;
  },
});
