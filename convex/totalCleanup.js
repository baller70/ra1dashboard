import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteAllDashboardData = mutation({
  args: {
    confirmCleanup: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmCleanup) {
      throw new Error("Cleanup not confirmed");
    }

    console.log("🗑️ Starting total cleanup of all dashboard data...");
    
    const results = [];

    try {
      // Delete all message logs
      const messageLogs = await ctx.db.query("messageLogs").collect();
      for (const message of messageLogs) {
        await ctx.db.delete(message._id);
      }
      results.push({ table: "messageLogs", deleted: messageLogs.length });
      console.log(`✅ Deleted ${messageLogs.length} message logs`);

      // Delete all parents (should already be empty)
      const parents = await ctx.db.query("parents").collect();
      for (const parent of parents) {
        await ctx.db.delete(parent._id);
      }
      results.push({ table: "parents", deleted: parents.length });
      console.log(`✅ Deleted ${parents.length} parents`);

      // Delete all payments (should already be empty)
      const payments = await ctx.db.query("payments").collect();
      for (const payment of payments) {
        await ctx.db.delete(payment._id);
      }
      results.push({ table: "payments", deleted: payments.length });
      console.log(`✅ Deleted ${payments.length} payments`);

      // Delete all payment plans (should already be empty)
      const paymentPlans = await ctx.db.query("paymentPlans").collect();
      for (const plan of paymentPlans) {
        await ctx.db.delete(plan._id);
      }
      results.push({ table: "paymentPlans", deleted: paymentPlans.length });
      console.log(`✅ Deleted ${paymentPlans.length} payment plans`);

      // Delete all templates (should already be empty)
      const templates = await ctx.db.query("templates").collect();
      for (const template of templates) {
        await ctx.db.delete(template._id);
      }
      results.push({ table: "templates", deleted: templates.length });
      console.log(`✅ Deleted ${templates.length} templates`);

    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      throw error;
    }

    console.log("🎉 Total cleanup completed successfully!");
    
    return {
      success: true,
      message: "All dashboard data deleted successfully",
      results
    };
  },
});