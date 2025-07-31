import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple test query
export const getSystemSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("systemSettings").collect();
  },
});

// Simple upsert mutation
export const upsertSystemSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description || existing.description,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("systemSettings", {
        key: args.key,
        value: args.value,
        description: args.description || "",
        category: "general",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return await ctx.db.get(id);
    }
  },
});