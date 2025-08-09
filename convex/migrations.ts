import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const backfillPaymentMethods = mutation({
  handler: async (ctx) => {
    const allPayments = await ctx.db.query("payments").collect();
    const allPaymentPlans = await ctx.db.query("paymentPlans").collect();

    const planMethodMap = new Map(
      allPaymentPlans.map((plan) => [plan._id, plan.paymentMethod])
    );

    let updatedCount = 0;

    for (const payment of allPayments) {
      if (!payment.paymentMethod && payment.paymentPlanId) {
        const method = planMethodMap.get(payment.paymentPlanId);
        if (method) {
          await ctx.db.patch(payment._id, { paymentMethod: method });
          updatedCount++;
        }
      }
    }

    return { updatedCount };
  },
});    