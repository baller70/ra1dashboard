import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getParents = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 10, search, status } = args;

    let parentsQuery = ctx.db.query("parents");

    if (status) {
      parentsQuery = parentsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    const parents = await parentsQuery.collect();

    let filteredParents = parents;
    if (search) {
      filteredParents = parents.filter((parent) =>
        parent.name?.toLowerCase().includes(search.toLowerCase()) ||
        parent.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const offset = (page - 1) * limit;
    const paginatedParents = filteredParents.slice(offset, offset + limit);

    return {
      parents: paginatedParents,
      pagination: {
        page,
        limit,
        total: filteredParents.length,
        pages: Math.ceil(filteredParents.length / limit),
      },
    };
  },
});

export const getParent = query({
  args: { id: v.id("parents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createParent = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    status: v.optional(v.string()),
    teamId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const parentId = await ctx.db.insert("parents", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      address: args.address,
      emergencyContact: args.emergencyContact,
      emergencyPhone: args.emergencyPhone,
      status: args.status || "active",
      contractStatus: "pending",
      contractUrl: undefined,
      contractUploadedAt: undefined,
      contractExpiresAt: undefined,
      stripeCustomerId: undefined,
      teamId: args.teamId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return parentId;
  },
});

export const updateParent = mutation({
  args: {
    id: v.id("parents"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, updates);
    return id;
  },
});
