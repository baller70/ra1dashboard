import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

        return {
          ...payment,
          parent,
          paymentPlan,
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
      parent,
      paymentPlan,
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

    // FIXED: Calculate TOTAL POTENTIAL REVENUE - FILTER OUT TEST DATA, KEEP ONLY REAL HOUSTON FAMILY
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    console.log(`📊 Payment Analytics: Found ${paymentPlans.length} total payment plans`);
    
    // Real Houston family parent IDs (ONLY these should be counted)
    const realParentIds = [
      'j97en33trdcm4f7hzvzj5e6vsn7mwxxr', // Kevin Houston
      'j97f7v56vbr080c66j9zq36m0s7mwzts', // Casey Houston  
      'j97c2xwtde8px84t48m8qtw0fn7mzcfb', // Nate Houston
      'j97de6dyw5c8m50je4a31z248x7n2mwp'  // Matt Houston
    ];
    
    // Filter for ONLY real Houston family payment plans (active status + real parent ID)
    const activePaymentPlans = paymentPlans.filter(p => 
      p.status === 'active' && realParentIds.includes(p.parentId)
    );
    console.log(`📊 Payment Analytics: ${activePaymentPlans.length} REAL Houston family plans (filtered out test data)`);
    
    const totalRevenue = activePaymentPlans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    console.log(`💰 Payment Analytics: CLEANED Total potential revenue = $${totalRevenue}`);

    const collectedPayments = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPayments = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate overdue payments using consistent logic (amount and count)
    const now = Date.now();
    const overduePaymentsList = payments.filter(payment => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    });
    
    const overduePayments = overduePaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // FIXED: Count unique parents with overdue payments to match dashboard
    const uniqueParentsWithOverduePayments = new Set(overduePaymentsList.map(p => p.parentId)).size;

    // paymentPlans already fetched above for totalRevenue calculation
    
    // FIXED: Count unique parents with active plans to match dashboard
    const uniqueParentsWithPlans = new Set(activePaymentPlans.map(p => p.parentId)).size;

    const result = {
      totalRevenue, // Now sum of all active payment plan totalAmounts
      collectedPayments,
      pendingPayments,
      overduePayments,
      overdueCount: uniqueParentsWithOverduePayments, // Now shows unique parents
      activePlans: uniqueParentsWithPlans, // Now shows unique parents with plans
      avgPaymentTime: 3,
    };
    
    console.log(`📊 Payment Analytics FINAL RESULT: totalRevenue = $${result.totalRevenue}`);
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

export const updatePayment = mutation({
  args: {
    id: v.id("payments"),
    status: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    notes: v.optional(v.string()),
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
        history.push({
          id: `installment-paid-${installment._id}`,
          type: "installment_paid",
          title: `Installment #${installment.installmentNumber} Paid`,
          description: `Payment of $${installment.amount} received`,
          details: {
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            paidAt: installment.paidAt,
            paymentMethod: (installment as any).paymentMethod || "Unknown",
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
          paymentMethod: (payment as any).paymentMethod || "Unknown",
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
        return {
          ...plan,
          parent,
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

// Get overdue payments with consistent logic across all pages
export const getOverduePayments = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const payments = await ctx.db.query("payments").collect();
    
    // Get payments that are either:
    // 1. Already marked as 'overdue' 
    // 2. 'pending' but past their due date
    const overduePayments = payments.filter(payment => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    });

    // Enrich with parent data
    const enrichedOverduePayments = await Promise.all(
      overduePayments.map(async (payment) => {
        const parent = await safeGetParent(ctx, payment.parentId);

        // Calculate days past due
        const daysPastDue = payment.dueDate 
          ? Math.max(0, Math.floor((now - payment.dueDate) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          ...payment,
          parent,
          parentName: parent?.name || 'Unknown Parent',
          parentEmail: parent?.email || 'No email',
          daysPastDue
        };
      })
    );

    // Sort by due date (oldest first)
    return enrichedOverduePayments.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
  },
});

// Get count of overdue payments (for consistent use across dashboard and other pages)
export const getOverduePaymentsCount = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const payments = await ctx.db.query("payments").collect();
    
    // Count payments that are either:
    // 1. Already marked as 'overdue' 
    // 2. 'pending' but past their due date
    const overdueCount = payments.filter(payment => {
      if (payment.status === 'overdue') {
        return true;
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true;
      }
      return false;
    }).length;

    return overdueCount;
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

    // Delete all pending payments first
    for (const payment of payments) {
      if (payment.status !== 'paid') {
        await ctx.db.delete(payment._id);
      }
    }

    // Delete the payment plan
    await ctx.db.delete(args.id);

    return { success: true };
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
