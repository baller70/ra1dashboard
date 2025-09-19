import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPlayers = query({
  args: {
    search: v.optional(v.string()),
    parentId: v.optional(v.id("parents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { search, parentId, limit = 200 } = args;

    let q = ctx.db.query("players");
    if (parentId) {
      q = q.withIndex("by_parent", (idx) => idx.eq("parentId", parentId));
    }

    const all = await q.collect();

    const filtered = search
      ? all.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.team || "").toLowerCase().includes(search.toLowerCase())
        )
      : all;

    // Enrich with parent info (name/email) for convenience in UI
    const results: any[] = [];
    for (const p of filtered.slice(0, limit)) {
      const parent = await ctx.db.get(p.parentId);
      results.push({
        ...p,
        parentName: parent?.name || null,
        parentEmail: (parent as any)?.parentEmail || (parent as any)?.email || null,
      });
    }

    // sort by name for dropdown
    results.sort((a, b) => a.name.localeCompare(b.name));

    return { players: results };
  },
});

export const getPlayer = query({
  args: { id: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.id);
    if (!player) return null;
    const parent = await ctx.db.get(player.parentId);
    return {
      ...player,
      parentName: parent?.name || null,
      parentEmail: (parent as any)?.parentEmail || (parent as any)?.email || null,
    } as any;
  },
});

export const createPlayer = mutation({
  args: {
    parentId: v.id("parents"),
    name: v.string(),
    age: v.optional(v.string()),
    team: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("players", {
      parentId: args.parentId,
      name: args.name,
      age: args.age,
      team: args.team,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updatePlayer = mutation({
  args: {
    id: v.id("players"),
    name: v.optional(v.string()),
    age: v.optional(v.string()),
    team: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

