import { mutation } from "./_generated/server";

// Cleanup function to remove ALL test data and keep only real Houston family data
export const cleanupAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Starting cleanup of ALL test data...");
    
    // Get all parents
    const allParents = await ctx.db.query("parents").collect();
    console.log(`📊 Found ${allParents.length} total parents`);
    
    // Define REAL parents (only Houston family members)
    const realParentEmails = [
      "khouston721@gmail.com",  // Kevin Houston
      "khouston@gmail.com",     // Casey Houston  
      "khous7@gmail.com",       // Nate Houston
      "khouston75621@gmail.com" // Matt Houston
    ];
    
    const realParentNames = [
      "Kevin Houston",
      "Casey Houston", 
      "Nate Houston",
      "matt Houston"
    ];
    
    // Identify real vs test parents
    const realParents = allParents.filter(parent => 
      realParentEmails.includes(parent.email) || 
      realParentNames.includes(parent.name)
    );
    
    const testParents = allParents.filter(parent => 
      !realParentEmails.includes(parent.email) && 
      !realParentNames.includes(parent.name)
    );
    
    console.log(`✅ Real parents: ${realParents.length}`);
    console.log(`❌ Test parents to delete: ${testParents.length}`);
    
    // Get test parent IDs
    const testParentIds = testParents.map(p => p._id);
    
    let deletedCounts = {
      parents: 0,
      paymentPlans: 0,
      payments: 0,
      installments: 0,
      messageLogs: 0,
      notifications: 0
    };
    
    // 1. Delete test payment plans
    const allPaymentPlans = await ctx.db.query("paymentPlans").collect();
    for (const plan of allPaymentPlans) {
      if (testParentIds.includes(plan.parentId)) {
        await ctx.db.delete(plan._id);
        deletedCounts.paymentPlans++;
      }
    }
    
    // 2. Delete test payments
    const allPayments = await ctx.db.query("payments").collect();
    for (const payment of allPayments) {
      if (testParentIds.includes(payment.parentId)) {
        await ctx.db.delete(payment._id);
        deletedCounts.payments++;
      }
    }
    
    // 3. Delete test payment installments
    const allInstallments = await ctx.db.query("paymentInstallments").collect();
    for (const installment of allInstallments) {
      if (testParentIds.includes(installment.parentId)) {
        await ctx.db.delete(installment._id);
        deletedCounts.installments++;
      }
    }
    
    // 4. Delete test message logs
    const allMessageLogs = await ctx.db.query("messageLogs").collect();
    for (const log of allMessageLogs) {
      if (testParentIds.includes(log.parentId)) {
        await ctx.db.delete(log._id);
        deletedCounts.messageLogs++;
      }
    }
    
    // 5. Delete test notifications
    const allNotifications = await ctx.db.query("notifications").collect();
    for (const notification of allNotifications) {
      if (notification.parentId && testParentIds.includes(notification.parentId)) {
        await ctx.db.delete(notification._id);
        deletedCounts.notifications++;
      }
    }
    
    // 6. Finally delete test parents
    for (const parent of testParents) {
      await ctx.db.delete(parent._id);
      deletedCounts.parents++;
    }
    
    console.log("🎉 Cleanup completed!");
    console.log("📊 Deleted counts:", deletedCounts);
    console.log(`✅ Remaining real parents: ${realParents.length}`);
    
    return {
      success: true,
      deletedCounts,
      realParentsRemaining: realParents.length,
      realParents: realParents.map(p => ({ name: p.name, email: p.email }))
    };
  },
});

// Function to verify what remains after cleanup
export const verifyCleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const parents = await ctx.db.query("parents").collect();
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const payments = await ctx.db.query("payments").collect();
    
    console.log("📊 After cleanup verification:");
    console.log(`Parents: ${parents.length}`);
    console.log(`Payment Plans: ${paymentPlans.length}`);
    console.log(`Payments: ${payments.length}`);
    
    // Calculate correct total potential revenue
    const activePaymentPlans = paymentPlans.filter(p => p.status === 'active');
    const totalRevenue = activePaymentPlans.reduce((sum, plan) => sum + (plan.totalAmount || 0), 0);
    
    console.log(`💰 Correct Total Potential Revenue: $${totalRevenue}`);
    
    return {
      parents: parents.length,
      paymentPlans: paymentPlans.length,
      payments: payments.length,
      totalRevenue,
      parentsList: parents.map(p => ({ name: p.name, email: p.email }))
    };
  },
});