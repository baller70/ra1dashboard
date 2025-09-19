import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createPaymentPlan = mutation({
  args: {
    parentId: v.id("parents"),
    startDate: v.string(),
    paymentMethod: v.string(),
    type: v.string(),
    totalAmount: v.number(),
    installmentAmount: v.number(),
    installments: v.number(),
    description: v.string(),
    checkNumbers: v.optional(v.array(v.string())),
    frequency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const newPaymentPlanId = await ctx.db.insert("paymentPlans", {
      parentId: args.parentId,
      startDate: args.startDate,
      type: args.type,
      totalAmount: args.totalAmount,
      installmentAmount: args.installmentAmount,
      installments: args.installments,
      description: args.description,
      status: "active",
      frequency: args.frequency?.toString(),
      paymentMethod: args.paymentMethod,
    });

    const mainPaymentId = await ctx.db.insert("payments", {
      parentId: args.parentId,
      paymentPlanId: newPaymentPlanId,
      dueDate: new Date(args.startDate).getTime(),
      amount: args.totalAmount,
      status: "pending",
      paymentMethod: args.paymentMethod,
    });

    if (args.installments > 1) {
      for (let i = 0; i < args.installments; i++) {
        const dueDate = new Date(args.startDate);
        dueDate.setMonth(dueDate.getMonth() + i * (args.frequency || 1));
        await ctx.db.insert("paymentInstallments", {
          parentPaymentId: mainPaymentId,
          parentId: args.parentId,
          paymentPlanId: newPaymentPlanId,
          installmentNumber: i + 1,
          totalInstallments: args.installments,
          amount: args.installmentAmount,
          dueDate: dueDate.getTime(),
          status: "pending",
          remindersSent: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return { newPaymentPlanId, mainPaymentId };
  },
});

