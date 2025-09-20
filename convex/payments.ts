import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

import Stripe from "stripe";

// Utility function to safely get parent data with ID validation
async function safeGetParent(ctx: any, parentId: any) {
  // Accept Convex string IDs which are typically 32-characters long. Only reject obviously malformed values.
  if (!parentId || typeof parentId !== 'string' || parentId.length < 25) {
    return null;
  }

  try {
    return await ctx.db.get(parentId as Id<"parents">);
  } catch (error) {
    console.warn(`Failed to get parent with ID ${parentId}:`, error);
    return null;
  }
}

// Heuristic to determine payment method from payment/plan/notes
function guessPaymentMethodToken(payment: any, paymentPlan?: any): 'stripe_card' | 'check' | 'cash' {
  // Explicit payment field first
  const direct = (payment && payment.paymentMethod) ? String(payment.paymentMethod) : ''
  const plan = (paymentPlan && paymentPlan.paymentMethod) ? String(paymentPlan.paymentMethod) : ''
  const notes = String(payment?.notes || '').toLowerCase()

  const norm = (val: string) => {
    const v = (val || '').toLowerCase().trim()
    if (v === 'credit_card' || v === 'card' || v === 'stripe' || v === 'stripe_card') return 'stripe_card'
    if (v === 'check' || v === 'cheque' || v === 'cheques') return 'check'
    if (v === 'cash') return 'cash'
    return ''
  }

  const directNorm = norm(direct)
  if (directNorm) return directNorm as any

  const planNorm = norm(plan)
  if (planNorm) return planNorm as any

  // Infer from notes or Stripe fields
  if (notes.includes('stripe') || notes.includes('paid via') || notes.includes('****')) return 'stripe_card'
  if (notes.includes('check')) return 'check'
  if (notes.includes('cash')) return 'cash'

  // Fallback: assume card unless proven otherwise
  return 'stripe_card'
}

export const getPayments = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    parentId: v.optional(v.id("parents")),
    teamId: v.optional(v.string()),
    search: v.optional(v.string()),
    latestOnly: v.optional(v.boolean()),
    program: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      page = 1,
      limit = 10,
      status,
      parentId,
      teamId,
      search,
      latestOnly = false,
    } = args;

    let paymentsQuery = ctx.db.query("payments");

    if (status) {
      paymentsQuery = paymentsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    if (args.paymentMethod) {
      paymentsQuery = paymentsQuery.filter((q) => q.eq(q.field("paymentMethod"), args.paymentMethod));
    }

    if (parentId) {
      paymentsQuery = paymentsQuery.filter((q) => q.eq(q.field("parentId"), parentId));
    }

    const payments = await paymentsQuery.collect();

    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        // Use safeGetParent to handle ID validation
        const parent = await safeGetParent(ctx, payment.parentId);

        // Only try to get payment plan if paymentPlanId is a valid Convex ID
        let paymentPlan = null;
        try {
          if (payment.paymentPlanId && typeof payment.paymentPlanId === 'string' && payment.paymentPlanId.length >= 25) {
            paymentPlan = await ctx.db.get(payment.paymentPlanId as Id<"paymentPlans">);
          }
        } catch (error) {
          // Invalid ID, keep paymentPlan as null
          console.log('Could not fetch payment plan for payment:', payment._id);
        }

        const methodToken = guessPaymentMethodToken(payment, paymentPlan)
        return {
          ...payment,
          parent,
          paymentPlan,
          paymentMethod: methodToken,
          // Add fallback parent name if parent fetch failed
          parentName: parent?.name || 'Unknown Parent',
          parentEmail: parent?.email || 'No email'
        };
      })
    );

    let filteredPayments = enrichedPayments;
    if (search) {
      filteredPayments = enrichedPayments.filter((payment) =>
        (payment.parent?.name && payment.parent.name.toLowerCase().includes(search.toLowerCase())) ||
        (payment.parent?.email && payment.parent.email.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (latestOnly) {
      const latestPaymentsMap = new Map();
      filteredPayments.forEach((payment) => {
        const parentId = payment.parentId;
        if (!latestPaymentsMap.has(parentId) ||
            (payment.dueDate && latestPaymentsMap.get(parentId).dueDate && payment.dueDate > latestPaymentsMap.get(parentId).dueDate)) {
          latestPaymentsMap.set(parentId, payment);
        }
      });
      filteredPayments = Array.from(latestPaymentsMap.values());
    }

    filteredPayments.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

    const offset = (page - 1) * limit;
    const paginatedPayments = filteredPayments.slice(offset, offset + limit);

    return {
      payments: paginatedPayments,
      pagination: {
        page,
        limit,
        total: filteredPayments.length,
        pages: Math.ceil(filteredPayments.length / limit),
      },
    };
  },
});

export const getPayment = query({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);

    if (!payment) {
      return null;
    }

    const parent = await safeGetParent(ctx, payment.parentId);

    // Fetch parent's contracts to expose contract status/details on payment detail page
    let parentContracts: any[] = [];
    try {
      if (parent?._id) {
        parentContracts = await ctx.db
          .query("contracts")
          .withIndex("by_parent", (q) => q.eq("parentId", parent._id as Id<"parents">))
          .collect();
        parentContracts.sort(
          (a, b) => (b.uploadedAt || b.createdAt || 0) - (a.uploadedAt || a.createdAt || 0)
        );
      }
    } catch (_) {
      // ignore contract fetch errors; UI will fallback gracefully
    }

    let paymentPlan = null;
    try {
      if (payment.paymentPlanId && typeof payment.paymentPlanId === 'string' && payment.paymentPlanId.length > 25) {
        paymentPlan = await ctx.db.get(payment.paymentPlanId as Id<"paymentPlans">);
      }
    } catch (error) {
      console.warn('Invalid payment plan ID:', payment.paymentPlanId);
    }

    return {
      ...payment,
      parent: parent
        ? {
            ...parent,
            contracts: parentContracts.map((c) => ({
              id: c._id,
              originalName: c.originalName,
              status: c.status,
              uploadedAt: c.uploadedAt || c.createdAt,
              expiresAt: c.expiresAt,
              fileUrl: c.fileUrl,
            })),
          }
        : parent,
      paymentPlan,
      // Normalize to a known token for UI badges
      paymentMethod: guessPaymentMethodToken(payment, paymentPlan),
    };
  },
});

export const getPaymentAnalytics = query({
  args: {
    program: v.optional(v.string()),
    latestOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db.query("payments").collect();

    // Fetch payment plans only; do NOT derive from parents
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    // Include newly created plans that are not yet fully active (case-insensitive)
    const countablePlans = paymentPlans.filter((p: any) => {
      const status = String(p.status || '').toLowerCase();
      return status === 'active' || status === 'pending';
    });

    // Deduplicate multiple plans per parent: take the plan with the largest totalAmount per parent
    const planByParent: Record<string, any> = {};
    for (const plan of countablePlans) {
      const parentKey = String((plan as any).parentId || '');
      const current = planByParent[parentKey];
      if (!current || Number(plan.totalAmount || 0) > Number(current.totalAmount || 0)) {
        planByParent[parentKey] = plan;
      }
    }
    const uniquePlans = Object.values(planByParent) as any[];

    // Potential revenue: sum of unique plans' totalAmount
    const totalRevenue = uniquePlans.reduce((sum, p: any) => sum + Number(p.totalAmount || 0), 0);

    // Collected: only explicit paid payments (no automatic assumptions)
    const collectedPayments = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Pending: remainder of plan totals after collected payments
    const pendingFromPlans = Math.max(totalRevenue - collectedPayments, 0);

    // Overdue: not automatic on payment creation; only count when a due is missed
    // Treat a plan as overdue only if its nextDueDate is clearly in the past BEYOND the first installment window
    const now = Date.now();
    const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;
    const computedOverduePlans = uniquePlans.filter((plan: any) => {
      const baseDue = plan.nextDueDate || plan.startDate;
      if (!baseDue) return false;
      // Assume monthly plans; advance one period for the first installment which is considered paid
      const periodDays = 30;
      const firstPaidCoverageUntil = baseDue + periodDays * MILLIS_IN_DAY;
      // If we're past the coverage window and there is an explicit overdue payment, mark overdue
      if (now > firstPaidCoverageUntil) {
        const hasExplicitOverdue = payments.some(p => p.paymentPlanId === plan._id && p.status === 'overdue');
        return hasExplicitOverdue;
      }
      return false;
    });

    const overdueCount = new Set(computedOverduePlans.map((p: any) => p.parentId)).size;
    const overduePayments = payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const uniqueParentsWithPlans = new Set(uniquePlans.map((p: any) => p.parentId)).size;

    const result = {
      totalRevenue,
      collectedPayments,
      pendingPayments: pendingFromPlans,
      overduePayments,
      overdueCount,
      activePlans: uniqueParentsWithPlans,
      avgPaymentTime: 0,
    } as const;

    console.log(`📊 Payment Analytics FINAL RESULT: plans=${countablePlans.length}, potential=$${result.totalRevenue}, collected=$${result.collectedPayments}, pending=$${result.pendingPayments}`);
    return result;
  },
});

export const createPayment = mutation({
  args: {
    parentId: v.id("parents"),
    amount: v.number(),
    dueDate: v.number(),
    status: v.string(),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    subscriptionId: v.optional(v.string()),
    installmentNumber: v.optional(v.number()),
    totalInstallments: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("payments", {
      parentId: args.parentId,
      paymentPlanId: args.paymentPlanId,
      dueDate: args.dueDate,
      amount: args.amount,
      status: args.status,
      paymentMethod: args.paymentMethod,
      stripeInvoiceId: undefined,
      stripePaymentId: undefined,
      paidAt: undefined,
      failureReason: undefined,
      remindersSent: 0,
      lastReminderSent: undefined,
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return paymentId;
  },
});

export const updatePayment = mutation({
  args: {
    id: v.id("payments"),
    status: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
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

export const deletePayment = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === "paid") {
      throw new Error("Cannot delete paid payment");
    }

    // Cascade delete: remove any installments tied to this payment
    try {
      const installments = await ctx.db
        .query("paymentInstallments")
        .withIndex("by_parent_payment", (q) => q.eq("parentPaymentId", args.id))
        .collect();
      for (const inst of installments) {
        await ctx.db.delete(inst._id);
      }
    } catch (_) {
      // If index not available, fall back to full scan by field
      const allInst = await ctx.db.query("paymentInstallments").collect();
      for (const inst of allInst) {
        if ((inst as any).parentPaymentId === args.id) {
          await ctx.db.delete(inst._id);
        }
      }
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getPaymentHistory = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);

    if (!payment) {
      return { history: [] };
    }

    // Get parent information for context
            const parent = await safeGetParent(ctx, payment.parentId);

    // Get payment plan information if available
    const paymentPlan = payment.paymentPlanId ?
      await ctx.db.get(payment.paymentPlanId) : null;

    // Get installment information if available
    const installments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_parent_payment", (q) => q.eq("parentPaymentId", args.paymentId))
      .collect();

    const history = [];

    // Payment creation event
    history.push({
      id: "created",
      type: "created",
      title: "Payment Created",
      description: `Payment of $${payment.amount} created for ${(parent as any)?.name || 'Parent'}`,
      details: {
        amount: payment.amount,
        parentName: (parent as any)?.name,
        parentEmail: (parent as any)?.email,
        paymentPlan: paymentPlan ? {
          type: (paymentPlan as any).type,
          totalAmount: (paymentPlan as any).totalAmount,
          installmentAmount: (paymentPlan as any).installmentAmount,
          installments: (paymentPlan as any).installments,
          description: (paymentPlan as any).description
        } : null,
        dueDate: payment.dueDate,
        status: "pending"
      },
      timestamp: payment.createdAt || Date.now(),
      performedBy: "System",
      icon: "plus-circle"
    });

    // Payment plan assignment (if applicable)
    if (paymentPlan) {
      history.push({
        id: "plan-assigned",
        type: "plan_assigned",
        title: "Payment Plan Assigned",
        description: `${(paymentPlan as any).type} payment plan assigned with ${(paymentPlan as any).installments} installments`,
        details: {
          planType: (paymentPlan as any).type,
          totalAmount: (paymentPlan as any).totalAmount,
          installmentAmount: (paymentPlan as any).installmentAmount,
          installments: (paymentPlan as any).installments,
          frequency: "monthly", // Default frequency
          description: (paymentPlan as any).description
        },
        timestamp: (paymentPlan as any).createdAt || payment.createdAt || Date.now(),
        performedBy: "System",
        icon: "calendar"
      });
    }

    // Installment creation events
    installments.forEach((installment, index) => {
      history.push({
        id: `installment-${installment._id}`,
        type: "installment_created",
        title: `Installment #${installment.installmentNumber} Created`,
        description: `Installment of $${installment.amount} due on ${new Date(installment.dueDate).toLocaleDateString()}`,
        details: {
          installmentNumber: installment.installmentNumber,
          amount: installment.amount,
          dueDate: installment.dueDate,
          status: installment.status,
          isPartOfPlan: true
        },
        timestamp: installment.createdAt || Date.now(),
        performedBy: "System",
        icon: "file-text"
      });

      // Installment payment events
      if (installment.paidAt) {
        const installmentMethod = (installment as any).paymentMethod || guessPaymentMethodToken(payment, paymentPlan)
        history.push({
          id: `installment-paid-${installment._id}`,
          type: "installment_paid",
          title: `Installment #${installment.installmentNumber} Paid`,
          description: `Payment of $${installment.amount} received`,
          details: {
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            paidAt: installment.paidAt,
            paymentMethod: installmentMethod,
            transactionId: (installment as any).transactionId,
            status: "paid"
          },
          timestamp: installment.paidAt,
          performedBy: "Parent/System",
          icon: "check-circle"
        });
      }

      // Overdue status changes
      if (installment.status === 'overdue' && installment.dueDate < Date.now()) {
        const daysPastDue = Math.floor((Date.now() - installment.dueDate) / (1000 * 60 * 60 * 24));
        history.push({
          id: `installment-overdue-${installment._id}`,
          type: "status_change",
          title: `Installment #${installment.installmentNumber} Overdue`,
          description: `Payment is ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} past due`,
          details: {
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            dueDate: installment.dueDate,
            daysPastDue: daysPastDue,
            status: "overdue"
          },
          timestamp: installment.dueDate + (24 * 60 * 60 * 1000), // Day after due date
          performedBy: "System",
          icon: "alert-triangle"
        });
      }
    });

    // Main payment completion (if applicable)
    if (payment.paidAt) {
      history.push({
        id: "payment-completed",
        type: "paid",
        title: "Payment Completed",
        description: `Full payment of $${payment.amount} received`,
          details: {
          amount: payment.amount,
          paidAt: payment.paidAt,
          paymentMethod: guessPaymentMethodToken(payment, paymentPlan),
          transactionId: (payment as any).transactionId,
          status: "paid",
          completedInstallments: installments.filter(i => i.status === 'paid').length,
          totalInstallments: installments.length
        },
        timestamp: typeof payment.paidAt === 'string' ? new Date(payment.paidAt).getTime() : (payment.paidAt || Date.now()),
        performedBy: "Parent/System",
        icon: "check-circle"
      });
    }

    // Status changes
    if (payment.status === 'overdue' && payment.dueDate && payment.dueDate < Date.now()) {
      const daysPastDue = Math.floor((Date.now() - payment.dueDate) / (1000 * 60 * 60 * 24));
      history.push({
        id: "payment-overdue",
        type: "status_change",
        title: "Payment Overdue",
        description: `Payment is ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} past due`,
        details: {
          amount: payment.amount,
          dueDate: payment.dueDate,
          daysPastDue: daysPastDue,
          status: "overdue"
        },
        timestamp: payment.dueDate + (24 * 60 * 60 * 1000),
        performedBy: "System",
        icon: "alert-triangle"
      });
    }

    // Sort history by timestamp (most recent first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    return {
      history,
      summary: {
        totalEvents: history.length,
        totalAmount: payment.amount,
        amountPaid: installments.reduce((sum, inst) => sum + (inst.status === 'paid' ? inst.amount : 0), 0),
        installmentsPaid: installments.filter(i => i.status === 'paid').length,
        totalInstallments: installments.length,
        parentName: (parent as any)?.name,
        paymentPlan: paymentPlan ? {
          type: (paymentPlan as any).type,
          description: (paymentPlan as any).description
        } : null
      }
    };
  },
});

export const createPaymentPlan = mutation({
  args: {
    parentId: v.id("parents"),
    type: v.string(),
    totalAmount: v.number(),
    installmentAmount: v.number(),
    installments: v.number(),
    startDate: v.number(),
    status: v.string(),
    description: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentPlanId = await ctx.db.insert("paymentPlans", {
      parentId: args.parentId,
      type: args.type,
      totalAmount: args.totalAmount,
      installmentAmount: args.installmentAmount,
      installments: args.installments,
      startDate: args.startDate,
      nextDueDate: args.startDate,
      status: args.status,
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      description: args.description,
      paymentMethod: args.paymentMethod,
      createdAt: now,
      updatedAt: now,
    });

    return paymentPlanId;
  },
});

export const getPaymentPlans = query({
  args: {
    parentId: v.optional(v.id("parents")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let plansQuery = ctx.db.query("paymentPlans");

    if (args.parentId) {
      plansQuery = plansQuery.filter((q) => q.eq(q.field("parentId"), args.parentId));
    }

    if (args.status) {
      plansQuery = plansQuery.filter((q) => q.eq(q.field("status"), args.status));
    }

    const plans = await plansQuery.collect();

    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const parent = await safeGetParent(ctx, plan.parentId);

        // Find the main payment record tied to this plan (if any)
        let mainPaymentId: Id<"payments"> | undefined = undefined as any;
        try {
          const planPayments = await ctx.db
            .query("payments")
            .withIndex("by_payment_plan", (q) => q.eq("paymentPlanId", plan._id))
            .collect();
          if (planPayments && planPayments.length > 0) {
            planPayments.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
            mainPaymentId = planPayments[0]._id as any;
          }
        } catch (_) {
          // ignore payment lookup errors
        }

        return {
          ...plan,
          parent,
          paymentMethod: plan.paymentMethod,
          mainPaymentId,
        };
      })
    );

    return enrichedPlans;
  },
});

// Debug function to check payment data structure
export const debugPaymentData = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments").take(3);
    const parents = await ctx.db.query("parents").take(3);

    return {
      samplePayments: payments.map(p => ({
        id: p._id,
        parentId: p.parentId,
        parentIdType: typeof p.parentId,
        parentIdLength: p.parentId ? p.parentId.toString().length : 0,
        amount: p.amount,
        status: p.status
      })),
      sampleParents: parents.map(p => ({
        id: p._id,
        name: p.name,
        email: p.email
      }))
    };
  },
});

// Delete payments with invalid parent IDs (cleanup function)
export const deletePaymentsWithInvalidParentIds = mutation({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments").collect();
    const deletedPayments = [];

    for (const payment of payments) {
      // Check if parent ID is in old Prisma format (starts with "cmd")
      if (payment.parentId && typeof payment.parentId === 'string' && payment.parentId.startsWith('cmd')) {
        try {
          await ctx.db.delete(payment._id);
          deletedPayments.push({
            id: payment._id,
            parentId: payment.parentId,
            amount: payment.amount,
            status: payment.status
          });
        } catch (error) {
          console.log('Could not delete payment:', payment._id, error);
        }
      }
    }

    return {
      deletedCount: deletedPayments.length,
      deletedPayments
    };
  },
});

export const createPaymentRecord = mutation({
  args: {
    parentId: v.id("parents"),
    amount: v.number(),
    dueDate: v.number(),
    status: v.string(),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    subscriptionId: v.optional(v.string()),
    installmentNumber: v.optional(v.number()),
    totalInstallments: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("payments", {
      parentId: args.parentId,
      paymentPlanId: args.paymentPlanId,
      dueDate: args.dueDate,
      amount: args.amount,
      status: args.status,
      stripeInvoiceId: undefined,
      stripePaymentId: undefined,
      paidAt: undefined,
      failureReason: undefined,
      remindersSent: 0,
      lastReminderSent: undefined,
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return paymentId;
  },
});

// Get individual payment plan with related data
export const getPaymentPlan = query({
  args: { id: v.id("paymentPlans") },
  handler: async (ctx, args) => {
    const paymentPlan = await ctx.db.get(args.id);
    if (!paymentPlan) return null;

    // Get parent
    const parent = await safeGetParent(ctx, paymentPlan.parentId);

    // Get related payments
    const payments = await ctx.db.query("payments")
      .filter(q => q.eq(q.field("paymentPlanId"), args.id))
      .collect();

    return {
      ...paymentPlan,
      parent,
      payments: payments.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
    };
  },
});

// Update payment plan
export const updatePaymentPlan = mutation({
  args: {
    id: v.id("paymentPlans"),
    type: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    installmentAmount: v.optional(v.number()),
    installments: v.optional(v.number()),
    startDate: v.optional(v.number()),
    nextDueDate: v.optional(v.number()),
    status: v.optional(v.string()),
    description: v.optional(v.string()),
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

// Delete payment plan
export const deletePaymentPlan = mutation({
  args: { id: v.id("paymentPlans") },
  handler: async (ctx, args) => {
    // Check if there are any paid payments
    const payments = await ctx.db.query("payments")
      .filter(q => q.eq(q.field("paymentPlanId"), args.id))
      .collect();

    const paidPayments = payments.filter(p => p.status === 'paid');
    if (paidPayments.length > 0) {
      throw new Error('Cannot delete payment plan with paid payments');
    }

    // First delete installments belonging to this plan
    const installments = await ctx.db.query("paymentInstallments").collect();
    for (const inst of installments) {
      if ((inst as any).paymentPlanId === args.id) {
        await ctx.db.delete(inst._id);
      }
    }

    // Then delete all non-paid payments for this plan
    for (const payment of payments) {
      if (payment.status !== 'paid') {
        // Also remove installments by parentPaymentId in case older records lack paymentPlanId
        const tiedInstallments = await ctx.db
          .query("paymentInstallments")
          .withIndex("by_parent_payment", (q) => q.eq("parentPaymentId", payment._id))
          .collect();
        for (const inst of tiedInstallments) {
          await ctx.db.delete(inst._id);
        }
        await ctx.db.delete(payment._id);
      }
    }

    // Delete the payment plan
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

export const getPaymentPlanByParentId = query({
  args: { parentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentPlans")
      .filter((q) => q.eq(q.field("parentId"), args.parentId))
      .first();
  },
});


// Activate a single payment plan
export const activatePaymentPlan = mutation({
  args: { id: v.id("paymentPlans") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'active',
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Activate all non-active payment plans
export const activateAllPaymentPlans = mutation({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query('paymentPlans').collect();
    let updated = 0;
    for (const plan of plans) {
      if (plan.status !== 'active') {
        await ctx.db.patch(plan._id, { status: 'active', updatedAt: Date.now() });
        updated++;
      }
    }
    return { success: true, updated };
  },
});

export const debugAllPaymentData = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments").collect();

    return {
      totalPayments: payments.length,
      paymentsWithPaidAt: payments.filter(p => p.paidAt !== undefined).length,
      paidPayments: payments.filter(p => p.status === 'paid'),
      samplePaidPayments: payments
        .filter(p => p.status === 'paid')
        .slice(0, 3)
        .map(p => ({
          id: p._id,
          status: p.status,
          paidAt: p.paidAt,
          paidAtType: typeof p.paidAt,
          amount: p.amount,
          parentId: p.parentId
        })),
      allPaymentStatuses: payments.reduce((acc, p) => {
        const status = p.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  },
});

// Get payments by payment plan ID
export const getPaymentsByPlanId = query({
  args: {
    paymentPlanId: v.id("paymentPlans"),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db.query("payments")
      .filter(q => q.eq(q.field("paymentPlanId"), args.paymentPlanId))
      .collect();

    return payments.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
  },
});

export const updatePaymentStatuses = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const pendingPayments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const payment of pendingPayments) {
      if (payment.dueDate && payment.dueDate < now) {
        await ctx.db.patch(payment._id, { status: "overdue" });
      }
    }
  },
});


// Clean up test payment plans - keep only real Houston family
export const cleanupTestPaymentPlans = mutation({
  args: { confirm: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return { error: "Must confirm cleanup by passing confirm: true" };
    }

    console.log("🧹 Cleaning up test payment plans...");

    // Real Houston family parent IDs
    const realParentIds = [
      'j97en33trdcm4f7hzvzj5e6vsn7mwxxr', // Kevin Houston
      'j97f7v56vbr080c66j9zq36m0s7mwzts', // Casey Houston
      'j97c2xwtde8px84t48m8qtw0fn7mzcfb', // Nate Houston
      'j97de6dyw5c8m50je4a31z248x7n2mwp'  // Matt Houston
    ];

    const allPaymentPlans = await ctx.db.query("paymentPlans").collect();
    console.log(`📊 Found ${allPaymentPlans.length} total payment plans`);

    const realPlans = allPaymentPlans.filter(plan => realParentIds.includes(plan.parentId));
    const testPlans = allPaymentPlans.filter(plan => !realParentIds.includes(plan.parentId));

    console.log(`✅ Real payment plans: ${realPlans.length}`);
    console.log(`❌ Test payment plans to delete: ${testPlans.length}`);

    let deletedCount = 0;

    // Delete test payment plans
    for (const plan of testPlans) {
      await ctx.db.delete(plan._id);
      deletedCount++;
    }

    console.log(`🎉 Deleted ${deletedCount} test payment plans`);
    console.log(`✅ Remaining real payment plans: ${realPlans.length}`);

    // Calculate correct total potential revenue
    const totalRevenue = realPlans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    console.log(`💰 Correct Total Potential Revenue: $${totalRevenue}`);

    return {
      success: true,
      deletedTestPlans: deletedCount,
      remainingRealPlans: realPlans.length,
      totalPotentialRevenue: totalRevenue,
      realPlans: realPlans.map(p => ({ parentId: p.parentId, totalAmount: p.totalAmount, status: p.status }))
    };
  },
});

    // Get payments with parent and payment plan info

    export const processDuePayments = mutation({
        args: { stripe: v.optional(v.any()) },
        handler: async (ctx, args) => {
            const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
            const stripe = key ? new Stripe(key) : (args as any)?.stripe;
            const now = new Date();
            const duePayments = await ctx.db
                .query("payments")
                .filter((q) => q.eq(q.field("status"), "pending"))
                .filter((q) => q.lte(q.field("dueDate"), now.getTime()))
                .collect();

            for (const payment of duePayments) {
                const parent = await ctx.db.get(payment.parentId as Id<"parents">);
                if (parent && parent.stripeCustomerId && stripe) {
                    try {
                        const paymentIntents = await stripe.paymentIntents.create({
                            amount: payment.amount * 100,
                            currency: "usd",
                            customer: parent.stripeCustomerId,
                            payment_method: parent.stripePaymentMethodId,
                            off_session: true,
                            confirm: true,
                        });
                        await ctx.db.patch(payment._id, {
                            status: "paid",
                            paidAt: Date.now(),
                            stripePaymentId: paymentIntents.id,
                        });
                    } catch (error) {
                        console.error("Stripe payment processing error:", error);
                        await ctx.db.patch(payment._id, {
                            status: "failed",
                            failureReason: (error as Error).message,
                        });
                    }
                }
            }
        },
    });

    export const markPaymentAsPaid = mutation({
        args: { paymentId: v.id("payments") },
        handler: async (ctx, args) => {
            await ctx.db.patch(args.paymentId, {
                status: "paid",
                paidAt: Date.now(),
            });
        },
    });

    export const checkForUpcomingPayments = mutation({
        handler: async (ctx) => {
            const now = new Date();
            const upcomingPayments = await ctx.db
                .query("payments")
                .filter((q) => q.eq(q.field("status"), "pending"))
                .collect();

            for (const payment of upcomingPayments) {
                if (payment.dueDate) {
                    const dueDate = new Date(payment.dueDate);
                    const diffTime = dueDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7 && diffDays > 0) {
                        const parent = await ctx.db.get(payment.parentId as Id<"parents">);
                        if (parent) {
                            await ctx.db.insert("notifications", {
                                parentId: parent._id,
                                title: "Upcoming Payment Reminder",
                                message: `Your payment of $${payment.amount} is due on ${dueDate.toLocaleDateString()}.`,
                                type: "payment_reminder",
                                priority: "medium",
                                isRead: false,
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            });
                        }
                    }
                }
            }
        },
    });
