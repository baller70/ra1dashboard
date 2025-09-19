import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createAssessment = mutation({
  args: {
    parentId: v.id("parents"),
    playerId: v.id("players"),
    programName: v.optional(v.string()),
    skills: v.array(v.object({ skillName: v.string(), rating: v.number() })),
    aiParentSuggestions: v.optional(v.string()),
    aiGameplayAnalysis: v.optional(v.string()),
    aiProgressSummary: v.optional(v.string()),
    category: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("assessments", {
      parentId: args.parentId,
      playerId: args.playerId,
      programName: args.programName,
      skills: args.skills,
      aiParentSuggestions: args.aiParentSuggestions,
      aiGameplayAnalysis: args.aiGameplayAnalysis,
      aiProgressSummary: args.aiProgressSummary,
      category: args.category,
      pdfUrl: args.pdfUrl,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const listByPlayer = query({
  args: { playerId: v.id("players"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { playerId, limit = 20 } = args;
    const all = await ctx.db
      .query("assessments")
      .withIndex("by_player", (idx) => idx.eq("playerId", playerId))
      .collect();
    const sorted = all.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));
    return { assessments: sorted.slice(0, limit) };
  },
});

export const listByParent = query({
  args: { parentId: v.id("parents"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { parentId, limit = 50 } = args;
    const all = await ctx.db
      .query("assessments")
      .withIndex("by_parent", (idx) => idx.eq("parentId", parentId))
      .collect();
    const sorted = all.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));
    return { assessments: sorted.slice(0, limit) };
  },
});

