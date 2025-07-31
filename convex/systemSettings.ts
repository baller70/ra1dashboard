import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all system settings
export const getSystemSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("systemSettings")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get system setting by key
export const getSystemSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Update or create system setting
export const upsertSystemSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { key, value, description, category } = args;
    
    // Check if setting already exists
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      // Update existing setting
      await ctx.db.patch(existing._id, {
        value,
        description: description || existing.description,
        category: category || existing.category,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    } else {
      // Create new setting
      const settingId = await ctx.db.insert("systemSettings", {
        key,
        value,
        description: description || "",
        category: category || "general",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return await ctx.db.get(settingId);
    }
  },
});

// Bulk update system settings
export const bulkUpdateSystemSettings = mutation({
  args: {
    settings: v.array(v.object({
      key: v.string(),
      value: v.any(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const setting of args.settings) {
      const result = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (result) {
        // Update existing
        await ctx.db.patch(result._id, {
          value: setting.value,
          description: setting.description || result.description,
          updatedAt: Date.now(),
        });
        results.push(await ctx.db.get(result._id));
      } else {
        // Create new
        const settingId = await ctx.db.insert("systemSettings", {
          key: setting.key,
          value: setting.value,
          description: setting.description || "",
          category: "general",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        results.push(await ctx.db.get(settingId));
      }
    }
    
    return results;
  },
});

// Delete system setting
export const deleteSystemSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    
    if (setting) {
      await ctx.db.patch(setting._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
      return { success: true };
    }
    
    return { success: false, error: "Setting not found" };
  },
});