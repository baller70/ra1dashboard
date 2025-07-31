import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTemplates = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    channel: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, search, category, channel, isActive } = args;

    let templatesQuery = ctx.db.query("templates");

    if (category && category !== 'all') {
      templatesQuery = templatesQuery.filter((q) => q.eq(q.field("category"), category));
    }

    if (channel && channel !== 'all') {
      templatesQuery = templatesQuery.filter((q) => q.eq(q.field("channel"), channel));
    }

    if (isActive !== undefined) {
      templatesQuery = templatesQuery.filter((q) => q.eq(q.field("isActive"), isActive));
    }

    const templates = await templatesQuery.collect();

    let filteredTemplates = templates;
    if (search) {
      filteredTemplates = templates.filter((template) =>
        (template.name && template.name.toLowerCase().includes(search.toLowerCase())) ||
        (template.subject && template.subject.toLowerCase().includes(search.toLowerCase())) ||
        (template.content && template.content.toLowerCase().includes(search.toLowerCase())) ||
        (template.body && template.body.toLowerCase().includes(search.toLowerCase()))
      );
    }

    const offset = (page - 1) * limit;
    const paginatedTemplates = filteredTemplates.slice(offset, offset + limit);

    return {
      templates: paginatedTemplates,
      pagination: {
        page,
        limit,
        total: filteredTemplates.length,
        pages: Math.ceil(filteredTemplates.length / limit),
      },
    };
  },
});

export const getTemplate = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    content: v.optional(v.string()),
    body: v.optional(v.string()),
    channel: v.optional(v.string()),
    type: v.optional(v.string()),
    category: v.string(),
    isActive: v.optional(v.boolean()),
    isAiGenerated: v.optional(v.boolean()),
    variables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      subject: args.subject,
      content: args.content,
      body: args.body,
      channel: args.channel || "email",
      type: args.type || "general",
      category: args.category,
      isActive: args.isActive !== undefined ? args.isActive : true,
      isAiGenerated: args.isAiGenerated || false,
      usageCount: 0,
      variables: args.variables,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    content: v.optional(v.string()),
    body: v.optional(v.string()),
    channel: v.optional(v.string()),
    type: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    variables: v.optional(v.any()),
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

export const deleteTemplate = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const incrementTemplateUsage = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (template) {
      await ctx.db.patch(args.id, {
        usageCount: (template.usageCount || 0) + 1,
        updatedAt: Date.now(),
      });
    }
    return template;
  },
}); 