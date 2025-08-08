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

    const allParents = await parentsQuery.collect();
    
    // FILTER OUT TEST DATA: Only return the 2 REAL Houston family parents
    const realParentEmails = [
      "khouston75621@gmail.com", // Matt Houston
      "khouston721@gmail.com"    // Kevin Houston
    ];
    
    // Only return the 2 REAL parents as confirmed by user
    const parents = allParents.filter(parent => 
      realParentEmails.includes(parent.email)
    );

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

export const getParentFresh = query({
  args: { 
    id: v.id("parents"),
    timestamp: v.optional(v.number()) // Force fresh query with timestamp
  },
  handler: async (ctx, args) => {
    // The timestamp parameter forces Convex to treat this as a new query
    console.log('getParentFresh called with timestamp:', args.timestamp);
    const parent = await ctx.db.get(args.id);
    console.log('getParentFresh returning:', parent);
    return parent;
  },
});

// Delete parent function
export const deleteParent = mutation({
  args: { id: v.id("parents") },
  handler: async (ctx, args) => {
    // Check if parent exists
    const parent = await ctx.db.get(args.id);
    if (!parent) {
      throw new Error("Parent not found");
    }
    
    // Cascade delete related data:
    // 1) Delete payment plans and their non-paid payments
    const plans = await ctx.db.query("paymentPlans").filter(q => q.eq(q.field("parentId"), args.id)).collect();
    for (const plan of plans) {
      // Delete payments under this plan
      const payments = await ctx.db.query("payments").filter(q => q.eq(q.field("paymentPlanId"), plan._id)).collect();
      for (const payment of payments) {
        // Allow deleting all payments for this parent when cascading
        await ctx.db.delete(payment._id);
      }
      // Delete installments under this plan
      const installments = await ctx.db.query("paymentInstallments").withIndex("by_parent", q => q.eq("parentId", args.id)).collect();
      for (const inst of installments) {
        await ctx.db.delete(inst._id);
      }
      // Finally delete the plan
      await ctx.db.delete(plan._id);
    }

    // 2) Delete any remaining payments directly tied to the parent (without a plan)
    const directPayments = await ctx.db.query("payments").filter(q => q.eq(q.field("parentId"), args.id)).collect();
    for (const dp of directPayments) {
      await ctx.db.delete(dp._id);
    }

    // 3) Delete message logs for this parent
    const messages = await ctx.db.query("messageLogs").collect();
    for (const m of messages) {
      if ((m as any).parentId === args.id) {
        await ctx.db.delete(m._id);
      }
    }

    // Finally delete the parent
    await ctx.db.delete(args.id);
    
    return { success: true, deletedId: args.id };
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
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    status: v.optional(v.string()),
    contractStatus: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Add updatedAt timestamp
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    await ctx.db.patch(id, updateData);
    
    // Return the updated parent record
    return await ctx.db.get(id);
  },
});
