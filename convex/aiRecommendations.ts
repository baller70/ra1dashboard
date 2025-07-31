import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// AI RECOMMENDATIONS QUERIES

export const getAiRecommendations = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    parentId: v.optional(v.id("parents")),
    type: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, parentId, type, priority, status } = args;

    let recommendationsQuery = ctx.db.query("aiRecommendations");

    if (parentId) {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    if (type && type !== 'all') {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("type"), type));
    }

    if (priority && priority !== 'all') {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("priority"), priority));
    }

    if (status && status !== 'all') {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    const recommendations = await recommendationsQuery.order("desc").collect();

    // Get parent information for each recommendation
    const recommendationsWithParents = await Promise.all(
      recommendations.map(async (recommendation) => {
        const parent = recommendation.parentId ? await ctx.db.get(recommendation.parentId) : null;
        const payment = recommendation.paymentId ? await ctx.db.get(recommendation.paymentId) : null;
        const contract = recommendation.contractId ? await ctx.db.get(recommendation.contractId) : null;
        
        return {
          ...recommendation,
          parent,
          payment,
          contract,
        };
      })
    );

    const offset = (page - 1) * limit;
    const paginatedRecommendations = recommendationsWithParents.slice(offset, offset + limit);

    return {
      recommendations: paginatedRecommendations,
      pagination: {
        page,
        limit,
        total: recommendationsWithParents.length,
        hasMore: offset + limit < recommendationsWithParents.length,
      },
    };
  },
});

export const getAiRecommendation = query({
  args: { id: v.id("aiRecommendations") },
  handler: async (ctx, args) => {
    const recommendation = await ctx.db.get(args.id);
    if (!recommendation) return null;

    const parent = recommendation.parentId ? await ctx.db.get(recommendation.parentId) : null;
    const payment = recommendation.paymentId ? await ctx.db.get(recommendation.paymentId) : null;
    const contract = recommendation.contractId ? await ctx.db.get(recommendation.contractId) : null;

    // Get associated actions
    const actions = await ctx.db
      .query("aiRecommendationActions")
      .withIndex("by_recommendation", (q) => q.eq("recommendationId", args.id))
      .collect();
    
    return {
      ...recommendation,
      parent,
      payment,
      contract,
      actions,
    };
  },
});

export const getPendingRecommendations = query({
  args: {
    parentId: v.optional(v.id("parents")),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let recommendationsQuery = ctx.db
      .query("aiRecommendations")
      .withIndex("by_status", (q) => q.eq("status", "pending"));

    if (args.parentId) {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("parentId"), args.parentId));
    }

    if (args.priority && args.priority !== 'all') {
      recommendationsQuery = recommendationsQuery.filter((q) => q.eq(q.field("priority"), args.priority));
    }

    const recommendations = await recommendationsQuery
      .order("desc")
      .collect();

    const recommendationsWithParents = await Promise.all(
      recommendations.map(async (recommendation) => {
        const parent = recommendation.parentId ? await ctx.db.get(recommendation.parentId) : null;
        return {
          ...recommendation,
          parent,
        };
      })
    );

    return recommendationsWithParents;
  },
});

export const getRecommendationStats = query({
  args: {},
  handler: async (ctx, args) => {
    const recommendations = await ctx.db.query("aiRecommendations").collect();

    const stats = {
      total: recommendations.length,
      pending: recommendations.filter(r => r.status === 'pending').length,
      accepted: recommendations.filter(r => r.status === 'accepted').length,
      executed: recommendations.filter(r => r.status === 'executed').length,
      dismissed: recommendations.filter(r => r.status === 'dismissed').length,
      highPriority: recommendations.filter(r => r.priority === 'high' || r.priority === 'urgent').length,
      byType: {
        payment_reminder: recommendations.filter(r => r.type === 'payment_reminder').length,
        contract_followup: recommendations.filter(r => r.type === 'contract_followup').length,
        risk_assessment: recommendations.filter(r => r.type === 'risk_assessment').length,
        engagement: recommendations.filter(r => r.type === 'engagement').length,
      },
    };

    return stats;
  },
});

// AI RECOMMENDATIONS MUTATIONS

export const createAiRecommendation = mutation({
  args: {
    parentId: v.optional(v.id("parents")),
    paymentId: v.optional(v.id("payments")),
    contractId: v.optional(v.id("contracts")),
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    description: v.string(),
    recommendation: v.string(),
    aiConfidence: v.number(),
    dataPoints: v.any(),
    actions: v.array(v.object({
      type: v.string(),
      label: v.string(),
      parameters: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const recommendationId = await ctx.db.insert("aiRecommendations", {
      parentId: args.parentId,
      paymentId: args.paymentId,
      contractId: args.contractId,
      type: args.type,
      priority: args.priority,
      title: args.title,
      description: args.description,
      recommendation: args.recommendation,
      aiConfidence: args.aiConfidence,
      dataPoints: args.dataPoints,
      status: "pending",
      actions: args.actions,
      createdAt: now,
      updatedAt: now,
    });

    return recommendationId;
  },
});

export const updateRecommendationStatus = mutation({
  args: {
    id: v.id("aiRecommendations"),
    status: v.string(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updateData: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === 'accepted') {
      updateData.acceptedAt = now;
    } else if (args.status === 'executed') {
      updateData.executedAt = now;
    } else if (args.status === 'dismissed') {
      updateData.dismissedAt = now;
    }

    if (args.feedback) {
      updateData.feedback = args.feedback;
    }

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

export const deleteRecommendation = mutation({
  args: { id: v.id("aiRecommendations") },
  handler: async (ctx, args) => {
    // Delete associated actions first
    const actions = await ctx.db
      .query("aiRecommendationActions")
      .withIndex("by_recommendation", (q) => q.eq("recommendationId", args.id))
      .collect();

    for (const action of actions) {
      await ctx.db.delete(action._id);
    }

    // Delete the recommendation
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const bulkUpdateRecommendations = mutation({
  args: {
    recommendationIds: v.array(v.id("aiRecommendations")),
    status: v.string(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates = [];

    for (const recommendationId of args.recommendationIds) {
      const updateData: any = {
        status: args.status,
        updatedAt: now,
      };

      if (args.status === 'accepted') {
        updateData.acceptedAt = now;
      } else if (args.status === 'executed') {
        updateData.executedAt = now;
      } else if (args.status === 'dismissed') {
        updateData.dismissedAt = now;
      }

      if (args.feedback) {
        updateData.feedback = args.feedback;
      }

      await ctx.db.patch(recommendationId, updateData);
      updates.push(recommendationId);
    }

    return { updatedCount: updates.length, recommendationIds: updates };
  },
});

// AI RECOMMENDATION ACTIONS

export const createRecommendationAction = mutation({
  args: {
    recommendationId: v.id("aiRecommendations"),
    actionType: v.string(),
    parameters: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const actionId = await ctx.db.insert("aiRecommendationActions", {
      recommendationId: args.recommendationId,
      actionType: args.actionType,
      parameters: args.parameters,
      status: "pending",
      createdAt: now,
    });

    return actionId;
  },
});

export const updateActionStatus = mutation({
  args: {
    id: v.id("aiRecommendationActions"),
    status: v.string(),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
    };

    if (args.status === 'completed' || args.status === 'failed') {
      updateData.executedAt = Date.now();
    }

    if (args.result) {
      updateData.result = args.result;
    }

    if (args.errorMessage) {
      updateData.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

export const getRecommendationActions = query({
  args: { recommendationId: v.id("aiRecommendations") },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query("aiRecommendationActions")
      .withIndex("by_recommendation", (q) => q.eq("recommendationId", args.recommendationId))
      .order("desc")
      .collect();

    return actions;
  },
});

export const executeRecommendationAction = mutation({
  args: {
    actionId: v.id("aiRecommendationActions"),
  },
  handler: async (ctx, args) => {
    const action = await ctx.db.get(args.actionId);
    if (!action) {
      throw new Error("Action not found");
    }

    // Mark action as executing
    await ctx.db.patch(args.actionId, {
      status: "executing",
    });

    try {
      // Execute the action based on its type
      let result = null;
      
      switch (action.actionType) {
        case 'send_message':
          // This would integrate with your messaging system
          result = { messageId: `msg_${Date.now()}`, status: 'sent' };
          break;
        case 'create_payment_plan':
          // This would create a payment plan
          result = { paymentPlanId: `plan_${Date.now()}`, status: 'created' };
          break;
        case 'schedule_call':
          // This would schedule a call/reminder
          result = { scheduledFor: Date.now() + 86400000, status: 'scheduled' };
          break;
        case 'update_status':
          // This would update parent/payment status
          result = { updated: true, status: 'completed' };
          break;
        default:
          throw new Error(`Unknown action type: ${action.actionType}`);
      }

      // Mark action as completed
      await ctx.db.patch(args.actionId, {
        status: "completed",
        result: result,
        executedAt: Date.now(),
      });

      return { success: true, result };
    } catch (error) {
      // Mark action as failed
      await ctx.db.patch(args.actionId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        executedAt: Date.now(),
      });

      throw error;
    }
  },
}); 