import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Utility function to safely get parent data with ID validation
async function safeGetParent(ctx: any, parentId: any) {
  if (!parentId || typeof parentId !== 'string') {
    return null;
  }
  
  try {
    return await ctx.db.get(parentId as Id<"parents">);
  } catch (error) {
    console.warn(`Failed to get parent with ID ${parentId}:`, error);
    return null;
  }
}

// CONTRACTS QUERIES

export const getContracts = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    parentId: v.optional(v.id("parents")),
    templateType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, status, parentId, templateType } = args;

    let contractsQuery = ctx.db.query("contracts");

    if (parentId) {
      contractsQuery = contractsQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (status && status !== 'all') {
      contractsQuery = contractsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (templateType && templateType !== 'all') {
      contractsQuery = contractsQuery.filter((q) => q.eq(q.field("templateType"), templateType));
    }

    const contracts = await contractsQuery.order("desc").collect();

    // Get parent information for each contract
    const contractsWithParents = await Promise.all(
      contracts.map(async (contract) => {
        const parent = await safeGetParent(ctx, contract.parentId);
        return {
          ...contract,
          parent,
        };
      })
    );

    const offset = (page - 1) * limit;
    const paginatedContracts = contractsWithParents.slice(offset, offset + limit);

    return {
      contracts: paginatedContracts,
      pagination: {
        page,
        limit,
        total: contractsWithParents.length,
        hasMore: offset + limit < contractsWithParents.length,
      },
    };
  },
});

export const getContract = query({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.id);
    if (!contract) return null;

    const parent = await safeGetParent(ctx, contract.parentId);
    
    return {
      ...contract,
      parent,
    };
  },
});

export const getContractsByParent = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order("desc")
      .collect();

    return contracts;
  },
});

export const getOverdueContracts = query({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_overdue", (q) => 
        q.eq("status", "pending").lt("expiresAt", now)
      )
      .collect();

    const contractsWithParents = await Promise.all(
      contracts.map(async (contract) => {
        const parent = await safeGetParent(ctx, contract.parentId);
        return {
          ...contract,
          parent,
        };
      })
    );

    return contractsWithParents;
  },
});

export const getContractStats = query({
  args: {},
  handler: async (ctx, args) => {
    const contracts = await ctx.db.query("contracts").collect();
    const now = Date.now();

    const stats = {
      total: contracts.length,
      signed: contracts.filter(c => c.status === 'signed').length,
      pending: contracts.filter(c => c.status === 'pending').length,
      expired: contracts.filter(c => c.status === 'expired').length,
      expiringSoon: contracts.filter(c => 
        c.status === 'pending' && 
        c.expiresAt && 
        c.expiresAt > now && 
        c.expiresAt < now + (7 * 24 * 60 * 60 * 1000) // 7 days
      ).length,
    };

    return stats;
  },
});

// CONTRACTS MUTATIONS

export const createContract = mutation({
  args: {
    parentId: v.id("parents"),
    fileName: v.string(),
    originalName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    templateType: v.optional(v.string()),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const contractId = await ctx.db.insert("contracts", {
      parentId: args.parentId,
      fileName: args.fileName,
      originalName: args.originalName,
      fileUrl: args.fileUrl,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: "pending",
      templateType: args.templateType,
      notes: args.notes,
      expiresAt: args.expiresAt,
      uploadedAt: now,
      remindersSent: 0,
      createdAt: now,
      updatedAt: now,
    });

    return contractId;
  },
});

export const updateContract = mutation({
  args: {
    id: v.id("contracts"),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    signatureData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const deleteContract = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const bulkUpdateContractStatus = mutation({
  args: {
    contractIds: v.array(v.id("contracts")),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates = [];

    for (const contractId of args.contractIds) {
      const updateData: any = {
        status: args.status,
        updatedAt: now,
      };

      if (args.status === 'signed') {
        updateData.signedAt = now;
      }

      await ctx.db.patch(contractId, updateData);
      updates.push(contractId);
    }

    return { updatedCount: updates.length, contractIds: updates };
  },
});

export const incrementContractReminders = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.id);
    if (!contract) return null;

    await ctx.db.patch(args.id, {
      remindersSent: (contract.remindersSent || 0) + 1,
      lastReminderSent: Date.now(),
      updatedAt: Date.now(),
    });

    return contract;
  },
});

// CONTRACT TEMPLATES

export const getContractTemplates = query({
  args: {
    templateType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let templatesQuery = ctx.db.query("contractTemplates");

    if (args.templateType && args.templateType !== 'all') {
      templatesQuery = templatesQuery.filter((q) => q.eq(q.field("templateType"), args.templateType));
    }

    if (args.isActive !== undefined) {
      templatesQuery = templatesQuery.filter((q) => q.eq(q.field("isActive"), args.isActive));
    }

    const templates = await templatesQuery.order("desc").collect();
    return templates;
  },
});

export const createContractTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    templateType: v.string(),
    fileUrl: v.string(),
    variables: v.array(v.string()),
    autoExpireDays: v.optional(v.number()),
    reminderSchedule: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const templateId = await ctx.db.insert("contractTemplates", {
      name: args.name,
      description: args.description,
      templateType: args.templateType,
      fileUrl: args.fileUrl,
      isActive: true,
      variables: args.variables,
      autoExpireDays: args.autoExpireDays,
      reminderSchedule: args.reminderSchedule,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

export const incrementTemplateUsage = mutation({
  args: { id: v.id("contractTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return null;

    await ctx.db.patch(args.id, {
      usageCount: (template.usageCount || 0) + 1,
      updatedAt: Date.now(),
    });

    return template;
  },
}); 