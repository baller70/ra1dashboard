import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// BACKGROUND JOBS QUERIES

export const getBackgroundJobs = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { page = 1, limit = 50, type, status, priority, createdBy } = args;

    let jobsQuery = ctx.db.query("backgroundJobs");

    if (type && type !== 'all') {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("type"), type));
    }

    if (status && status !== 'all') {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (priority && priority !== 'all') {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("priority"), priority));
    }

    if (createdBy) {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("createdBy"), createdBy));
    }

    const jobs = await jobsQuery.order("desc").collect();

    const offset = (page - 1) * limit;
    const paginatedJobs = jobs.slice(offset, offset + limit);

    return {
      jobs: paginatedJobs,
      pagination: {
        page,
        limit,
        total: jobs.length,
        hasMore: offset + limit < jobs.length,
      },
    };
  },
});

export const getBackgroundJob = query({
  args: { id: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;

    // Get job logs
    const logs = await ctx.db
      .query("jobLogs")
      .withIndex("by_job", (q) => q.eq("jobId", args.id))
      .order("desc")
      .collect();

    // Get child jobs if this is a parent job
    const childJobs = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_parent_job", (q) => q.eq("parentJobId", args.id))
      .collect();
    
    return {
      ...job,
      logs,
      childJobs,
    };
  },
});

export const getPendingJobs = query({
  args: {
    limit: v.optional(v.number()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { limit = 10, priority } = args;

    let jobsQuery = ctx.db
      .query("backgroundJobs")
      .withIndex("by_pending_jobs", (q) => q.eq("status", "pending"));

    if (priority && priority !== 'all') {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("priority"), priority));
    }

    const jobs = await jobsQuery
      .order("desc")
      .take(limit);

    return jobs;
  },
});

export const getRunningJobs = query({
  args: {},
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    return jobs;
  },
});

export const getJobStats = query({
  args: {},
  handler: async (ctx, args) => {
    const jobs = await ctx.db.query("backgroundJobs").collect();
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);

    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      last24Hours: jobs.filter(j => j.createdAt > last24Hours).length,
      byType: {
        email_batch: jobs.filter(j => j.type === 'email_batch').length,
        payment_sync: jobs.filter(j => j.type === 'payment_sync').length,
        data_export: jobs.filter(j => j.type === 'data_export').length,
        ai_analysis: jobs.filter(j => j.type === 'ai_analysis').length,
      },
      byPriority: {
        low: jobs.filter(j => j.priority === 'low').length,
        normal: jobs.filter(j => j.priority === 'normal').length,
        high: jobs.filter(j => j.priority === 'high').length,
        urgent: jobs.filter(j => j.priority === 'urgent').length,
      },
      averageCompletionTime: (() => {
        const completedJobs = jobs.filter(j => j.status === 'completed' && j.actualDuration);
        if (completedJobs.length === 0) return 0;
        const totalDuration = completedJobs.reduce((sum, j) => sum + (j.actualDuration || 0), 0);
        return Math.round(totalDuration / completedJobs.length);
      })(),
    };

    return stats;
  },
});

// BACKGROUND JOBS MUTATIONS

export const createBackgroundJob = mutation({
  args: {
    type: v.string(),
    priority: v.optional(v.string()),
    data: v.any(),
    parentJobId: v.optional(v.id("backgroundJobs")),
    createdBy: v.string(),
    estimatedDuration: v.optional(v.number()),
    maxRetries: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const jobId = await ctx.db.insert("backgroundJobs", {
      type: args.type,
      status: "pending",
      priority: args.priority || "normal",
      progress: 0,
      data: args.data,
      parentJobId: args.parentJobId,
      createdBy: args.createdBy,
      estimatedDuration: args.estimatedDuration,
      retryCount: 0,
      maxRetries: args.maxRetries || 3,
      createdAt: now,
      updatedAt: now,
    });

    // Log job creation
    await ctx.db.insert("jobLogs", {
      jobId: jobId,
      level: "info",
      message: `Job created: ${args.type}`,
      data: { priority: args.priority || "normal" },
      timestamp: now,
    });

    return jobId;
  },
});

export const updateJobStatus = mutation({
  args: {
    id: v.id("backgroundJobs"),
    status: v.string(),
    progress: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;

    const now = Date.now();
    const updateData: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.progress !== undefined) {
      updateData.progress = args.progress;
    }

    if (args.currentStep) {
      updateData.currentStep = args.currentStep;
    }

    if (args.result) {
      updateData.result = args.result;
    }

    if (args.errorMessage) {
      updateData.errorMessage = args.errorMessage;
      if (args.status === 'failed') {
        updateData.retryCount = (job.retryCount || 0) + 1;
      }
    }

    // Set timestamps based on status
    if (args.status === 'running' && !job.startedAt) {
      updateData.startedAt = now;
    } else if ((args.status === 'completed' || args.status === 'failed') && job.startedAt) {
      updateData.completedAt = now;
      updateData.actualDuration = now - job.startedAt;
    }

    await ctx.db.patch(args.id, updateData);

    // Log status change
    await ctx.db.insert("jobLogs", {
      jobId: args.id,
      level: args.status === 'failed' ? 'error' : 'info',
      message: `Job status changed to: ${args.status}`,
      data: { 
        progress: args.progress,
        currentStep: args.currentStep,
        errorMessage: args.errorMessage,
      },
      timestamp: now,
    });

    return args.id;
  },
});

export const updateJobProgress = mutation({
  args: {
    id: v.id("backgroundJobs"),
    progress: v.number(),
    currentStep: v.optional(v.string()),
    totalSteps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      progress: args.progress,
      currentStep: args.currentStep,
      totalSteps: args.totalSteps,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const retryJob = mutation({
  args: { id: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;

    if ((job.retryCount || 0) >= (job.maxRetries || 3)) {
      throw new Error("Job has exceeded maximum retry attempts");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "pending",
      progress: 0,
      currentStep: undefined,
      errorMessage: undefined,
      startedAt: undefined,
      completedAt: undefined,
      actualDuration: undefined,
      updatedAt: now,
    });

    // Log retry
    await ctx.db.insert("jobLogs", {
      jobId: args.id,
      level: "info",
      message: `Job retry initiated (attempt ${(job.retryCount || 0) + 1})`,
      timestamp: now,
    });

    return args.id;
  },
});

export const cancelJob = mutation({
  args: { id: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;

    if (job.status === 'completed') {
      throw new Error("Cannot cancel completed job");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "cancelled",
      completedAt: now,
      updatedAt: now,
    });

    // Log cancellation
    await ctx.db.insert("jobLogs", {
      jobId: args.id,
      level: "warning",
      message: "Job cancelled by user",
      timestamp: now,
    });

    return { success: true };
  },
});

export const deleteJob = mutation({
  args: { id: v.id("backgroundJobs") },
  handler: async (ctx, args) => {
    // Delete job logs first
    const logs = await ctx.db
      .query("jobLogs")
      .withIndex("by_job", (q) => q.eq("jobId", args.id))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Delete child jobs
    const childJobs = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_parent_job", (q) => q.eq("parentJobId", args.id))
      .collect();

    for (const childJob of childJobs) {
      // Delete child job logs first
      const childLogs = await ctx.db
        .query("jobLogs")
        .withIndex("by_job", (q) => q.eq("jobId", childJob._id))
        .collect();

      for (const childLog of childLogs) {
        await ctx.db.delete(childLog._id);
      }

      // Delete the child job
      await ctx.db.delete(childJob._id);
    }

    // Delete the job
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// JOB LOGS

export const getJobLogs = query({
  args: {
    jobId: v.id("backgroundJobs"),
    level: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, level, limit = 100 } = args;

    let logsQuery = ctx.db
      .query("jobLogs")
      .withIndex("by_job", (q) => q.eq("jobId", jobId));

    if (level && level !== 'all') {
      logsQuery = logsQuery.filter((q) => q.eq(q.field("level"), level));
    }

    const logs = await logsQuery
      .order("desc")
      .take(limit);

    return logs;
  },
});

export const addJobLog = mutation({
  args: {
    jobId: v.id("backgroundJobs"),
    level: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("jobLogs", {
      jobId: args.jobId,
      level: args.level,
      message: args.message,
      data: args.data,
      timestamp: Date.now(),
    });

    return logId;
  },
});

// JOB EXECUTION HELPERS

export const getNextPendingJob = query({
  args: {},
  handler: async (ctx, args) => {
    // Get highest priority pending job
    const urgentJob = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_pending_jobs", (q) => q.eq("status", "pending").eq("priority", "urgent"))
      .first();

    if (urgentJob) return urgentJob;

    const highJob = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_pending_jobs", (q) => q.eq("status", "pending").eq("priority", "high"))
      .first();

    if (highJob) return highJob;

    const normalJob = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_pending_jobs", (q) => q.eq("status", "pending").eq("priority", "normal"))
      .first();

    if (normalJob) return normalJob;

    const lowJob = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_pending_jobs", (q) => q.eq("status", "pending").eq("priority", "low"))
      .first();

    return lowJob || null;
  },
});

export const claimJob = mutation({
  args: {
    jobId: v.id("backgroundJobs"),
    workerId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== 'pending') {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "running",
      startedAt: now,
      updatedAt: now,
    });

    // Log job claim
    await ctx.db.insert("jobLogs", {
      jobId: args.jobId,
      level: "info",
      message: `Job claimed by worker: ${args.workerId}`,
      data: { workerId: args.workerId },
      timestamp: now,
    });

    return job;
  },
});

// BULK OPERATIONS

export const bulkUpdateJobStatus = mutation({
  args: {
    jobIds: v.array(v.id("backgroundJobs")),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates = [];

    for (const jobId of args.jobIds) {
      await ctx.db.patch(jobId, {
        status: args.status,
        updatedAt: now,
      });

      // Log status change
      await ctx.db.insert("jobLogs", {
        jobId: jobId,
        level: "info",
        message: `Bulk status change to: ${args.status}`,
        timestamp: now,
      });

      updates.push(jobId);
    }

    return { updatedCount: updates.length, jobIds: updates };
  },
});

export const cleanupCompletedJobs = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const olderThanDays = args.olderThanDays || 30;
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const oldJobs = await ctx.db
      .query("backgroundJobs")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("status"), "failed"),
            q.eq(q.field("status"), "cancelled")
          ),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

         let deletedCount = 0;
     for (const job of oldJobs) {
       // Delete job logs first
       const jobLogs = await ctx.db
         .query("jobLogs")
         .withIndex("by_job", (q) => q.eq("jobId", job._id))
         .collect();

       for (const log of jobLogs) {
         await ctx.db.delete(log._id);
       }

       // Delete the job
       await ctx.db.delete(job._id);
       deletedCount++;
     }

    return { deletedCount, cutoffTime };
  },
}); 