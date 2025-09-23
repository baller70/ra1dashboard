import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create installments when a payment plan is selected
export const createInstallments = mutation({
  args: {
    parentPaymentId: v.id("payments"),
    parentId: v.id("parents"),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    totalAmount: v.number(),
    installmentAmount: v.number(),
    totalInstallments: v.number(),
    frequency: v.number(), // months between payments
    startDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const installments: Id<"paymentInstallments">[] = [];

    for (let i = 0; i < args.totalInstallments; i++) {
      // Calculate due date for each installment
      const dueDate = new Date(args.startDate);
      dueDate.setMonth(dueDate.getMonth() + (i * args.frequency));

      // Always mark the first installment as paid when creating a payment plan
      const isFirstInstallment = i === 0;

      const installmentData: any = {
        parentPaymentId: args.parentPaymentId,
        parentId: args.parentId,
        paymentPlanId: args.paymentPlanId,
        installmentNumber: i + 1,
        totalInstallments: args.totalInstallments,
        amount: args.installmentAmount,
        dueDate: dueDate.getTime(),
        status: isFirstInstallment ? "paid" : "pending",
        remindersSent: 0,
        createdAt: now,
        updatedAt: now,
      };

      // Add paidAt field only for the first installment
      if (isFirstInstallment) {
        installmentData.paidAt = now;
      }

      const installmentId = await ctx.db.insert("paymentInstallments", installmentData);

      installments.push(installmentId);
    }

    return installments;
  },
});

// Create a single payment installment
export const createPaymentInstallment = mutation({
  args: {
    parentPaymentId: v.id("payments"),
    installmentNumber: v.number(),
    amount: v.number(),
    dueDate: v.string(),
    status: v.string(),
    paidAt: v.optional(v.string()),
    description: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const installmentData: any = {
      parentPaymentId: args.parentPaymentId,
      installmentNumber: args.installmentNumber,
      amount: args.amount,
      dueDate: new Date(args.dueDate).getTime(),
      status: args.status,
      description: args.description,
      remindersSent: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Add paidAt field if provided
    if (args.paidAt) {
      installmentData.paidAt = new Date(args.paidAt).getTime();
    }

    const installmentId = await ctx.db.insert("paymentInstallments", installmentData);
    return installmentId;
  },
});

// Get installments for a payment
export const getPaymentInstallments = query({
  args: {
    parentPaymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const installments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent_payment", (q) =>
        q.eq("parentPaymentId", args.parentPaymentId)
      )
      .order("asc")
      .collect();

    return installments;
  },
});

// Get installments for a parent
export const getParentInstallments = query({
  args: {
    parentId: v.id("parents"),
  },
  handler: async (ctx, args) => {
    const installments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent", (q) =>
        q.eq("parentId", args.parentId)
      )
      .order("asc")
      .collect();

    return installments;
  },
});

// Get overdue installments
export const getOverdueInstallments = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const overdueInstallments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_overdue", (q) =>
        q.eq("status", "pending")
      )
      .filter((q) => q.lt(q.field("dueDate"), now))
      .collect();

    return overdueInstallments;
  },
});

// Get installments in grace period
export const getGracePeriodInstallments = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const gracePeriodInstallments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_grace_period", (q) =>
        q.eq("isInGracePeriod", true)
      )
      .filter((q) => q.gt(q.field("gracePeriodEnd"), now))
      .collect();

    return gracePeriodInstallments;
  },
});

// Mark installment as paid
export const markInstallmentPaid = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
    stripePaymentIntentId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.installmentId, {
      status: "paid",
      paidAt: now,
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeInvoiceId: args.stripeInvoiceId,
      isInGracePeriod: false,
      gracePeriodEnd: undefined,
      updatedAt: now,
    });

    // Check if this was the last installment and update parent payment
    const installment = await ctx.db.get(args.installmentId);
    if (installment) {
      const allInstallments = await ctx.db
        .query("paymentInstallments")
        .withIndex("by_parent_payment", (q) =>
          q.eq("parentPaymentId", installment.parentPaymentId)
        )
        .collect();

      const paidInstallments = allInstallments.filter(i => i.status === "paid");

      // If all installments are paid, mark parent payment as paid
      if (paidInstallments.length === allInstallments.length) {
        await ctx.db.patch(installment.parentPaymentId, {
          status: "paid",
          paidAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Mark installment as overdue and start grace period
export const markInstallmentOverdue = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const gracePeriodEnd = now + (5 * 24 * 60 * 60 * 1000); // 5 days from now

    await ctx.db.patch(args.installmentId, {
      status: "overdue",
      isInGracePeriod: true,
      gracePeriodEnd: gracePeriodEnd,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Update reminder count
export const updateReminderSent = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const installment = await ctx.db.get(args.installmentId);

    if (installment) {
      await ctx.db.patch(args.installmentId, {
        remindersSent: installment.remindersSent + 1,
        lastReminderSent: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get payment progress for a parent payment
export const getPaymentProgress = query({
  args: {
    parentPaymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const installments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent_payment", (q) =>
        q.eq("parentPaymentId", args.parentPaymentId)
      )
      .collect();

    const totalInstallments = installments.length;
    const paidInstallments = installments.filter(i => i.status === "paid").length;
    const overdueInstallments = installments.filter(i => i.status === "overdue").length;
    const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = installments
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0);
    const remainingAmount = totalAmount - paidAmount;

    // Get next due installment
    const now = Date.now();
    const nextDue = installments
      .filter(i => i.status === "pending" && i.dueDate >= now)
      .sort((a, b) => a.dueDate - b.dueDate)[0];

    return {
      totalInstallments,
      paidInstallments,
      overdueInstallments,
      totalAmount,
      paidAmount,
      remainingAmount,
      progressPercentage: totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0,
      nextDue: nextDue ? {
        id: nextDue._id,
        amount: nextDue.amount,
        dueDate: nextDue.dueDate,
        installmentNumber: nextDue.installmentNumber,
      } : null,
      installments: installments.sort((a, b) => a.installmentNumber - b.installmentNumber),
    };
  },
});

// Admin function to modify payment schedule
export const modifyPaymentSchedule = mutation({
  args: {
    parentPaymentId: v.id("payments"),
    newSchedule: v.array(v.object({
      installmentId: v.optional(v.id("paymentInstallments")),
      amount: v.number(),
      dueDate: v.number(),
      installmentNumber: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing installments
    const existingInstallments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent_payment", (q) =>
        q.eq("parentPaymentId", args.parentPaymentId)
      )
      .collect();

    // Update or create installments based on new schedule
    for (const scheduleItem of args.newSchedule) {
      if (scheduleItem.installmentId) {
        // Update existing installment
        await ctx.db.patch(scheduleItem.installmentId, {
          amount: scheduleItem.amount,
          dueDate: scheduleItem.dueDate,
          updatedAt: now,
        });
      } else {
        // Create new installment (if needed)
        const parentInstallment = existingInstallments[0];
        if (parentInstallment) {
          await ctx.db.insert("paymentInstallments", {
            parentPaymentId: args.parentPaymentId,
            parentId: parentInstallment.parentId,
            paymentPlanId: parentInstallment.paymentPlanId,
            installmentNumber: scheduleItem.installmentNumber,
            totalInstallments: args.newSchedule.length,
            amount: scheduleItem.amount,
            dueDate: scheduleItem.dueDate,
            status: "pending",
            remindersSent: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});

// Mark the first installment as paid
export const markFirstInstallmentPaid = mutation({
  args: {
    parentPaymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the first installment for this payment
    const firstInstallment = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent_payment", (q) =>
        q.eq("parentPaymentId", args.parentPaymentId)
      )
      .filter((q) => q.eq(q.field("installmentNumber"), 1))
      .first();

    if (firstInstallment) {
      await ctx.db.patch(firstInstallment._id, {
        status: "paid",
        paidAt: now,
        updatedAt: now,
      });
      return firstInstallment._id;
    }

    return null;
  },
});

// Update installment status to paid (for testing first payment processing)
export const updateInstallmentToPaid = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.installmentId, {
      status: "paid",
      paidAt: now,
      updatedAt: now,
    });

    return args.installmentId;
  },
});

// Manually mark or unmark an installment as paid (no Stripe charge)
export const setManualInstallmentStatus = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
    markPaid: v.boolean(),
    method: v.optional(v.string()),
    note: v.optional(v.string()),
    actor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const installment = await ctx.db.get(args.installmentId);
    if (!installment) return { success: false, error: "Installment not found" };

    // Merge notes JSON with manualPayment info
    const existingNotes = (installment as any).notes || '';
    const existingParsed = (() => { try { return JSON.parse(existingNotes) } catch { return {} } })();

    const nextNotes = args.markPaid
      ? JSON.stringify({
          ...existingParsed,
          manualPayment: {
            at: now,
            method: args.method || 'manual',
            note: args.note || '',
            actor: args.actor || 'admin',
          },
        })
      : JSON.stringify({
          ...Object.fromEntries(Object.entries(existingParsed).filter(([k]) => k !== 'manualPayment')),
        });

    await ctx.db.patch(args.installmentId, {
      status: args.markPaid ? 'paid' : 'pending',
      paidAt: args.markPaid ? now : undefined,
      notes: nextNotes,
      updatedAt: now,
    });

    // If unmarking and parent payment was previously marked paid solely because all were paid, we leave parent status unchanged for safety.
    // A follow-up job can recompute parent status if needed.

    return { success: true, paid: args.markPaid };
  },
});
