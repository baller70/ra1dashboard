import { mutation } from "./_generated/server";

// NUCLEAR CLEANUP: Actually DELETE test data from database
export const deleteAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚨 NUCLEAR CLEANUP: Deleting ALL test data from database...");
    
    // Get all parents
    const allParents = await ctx.db.query("parents").collect();
    console.log(`📊 Found ${allParents.length} total parents in database`);
    
    // You said 2 is correct, so these are the ONLY 2 real parents to keep
    const realParentEmails = [
      "khouston75621@gmail.com", // Matt Houston
      "khouston721@gmail.com"    // Kevin Houston
    ];
    
    let deletedCounts = {
      parents: 0,
      paymentPlans: 0,
      payments: 0,
      installments: 0,
      messageLogs: 0,
      notifications: 0,
      templates: 0
    };
    
    // 1. IDENTIFY AND DELETE TEST PARENTS
    for (const parent of allParents) {
      if (!realParentEmails.includes(parent.email)) {
        console.log(`❌ DELETING TEST PARENT: ${parent.name} (${parent.email})`);
        
        // Delete all related data first
        const paymentPlans = await ctx.db
          .query("paymentPlans")
          .filter((q) => q.eq(q.field("parentId"), parent._id))
          .collect();
        
        for (const plan of paymentPlans) {
          await ctx.db.delete(plan._id);
          deletedCounts.paymentPlans++;
        }
        
        const payments = await ctx.db
          .query("payments")
          .filter((q) => q.eq(q.field("parentId"), parent._id))
          .collect();
        
        for (const payment of payments) {
          await ctx.db.delete(payment._id);
          deletedCounts.payments++;
        }
        
        const installments = await ctx.db
          .query("paymentInstallments")
          .filter((q) => q.eq(q.field("parentId"), parent._id))
          .collect();
        
        for (const installment of installments) {
          await ctx.db.delete(installment._id);
          deletedCounts.installments++;
        }
        
        const messageLogs = await ctx.db
          .query("messageLogs")
          .filter((q) => q.eq(q.field("parentId"), parent._id))
          .collect();
        
        for (const log of messageLogs) {
          await ctx.db.delete(log._id);
          deletedCounts.messageLogs++;
        }
        
        // Finally delete the parent
        await ctx.db.delete(parent._id);
        deletedCounts.parents++;
      } else {
        console.log(`✅ KEEPING REAL PARENT: ${parent.name} (${parent.email})`);
      }
    }
    
    // 2. DELETE ALL TEST TEMPLATES
    const allTemplates = await ctx.db.query("templates").collect();
    for (const template of allTemplates) {
      const hasTestIndicators = 
        template.name?.toLowerCase().includes('test') ||
        template.name?.toLowerCase().includes('sample') ||
        template.name?.toLowerCase().includes('demo') ||
        template.content?.toLowerCase().includes('test') ||
        template.content?.toLowerCase().includes('sample');
      
      if (hasTestIndicators) {
        console.log(`❌ DELETING TEST TEMPLATE: ${template.name}`);
        await ctx.db.delete(template._id);
        deletedCounts.templates++;
      }
    }
    
    // 3. DELETE ALL SAMPLE NOTIFICATIONS
    const allNotifications = await ctx.db.query("notifications").collect();
    for (const notification of allNotifications) {
      if (notification.metadata && (notification.metadata as any).sample === true) {
        console.log(`❌ DELETING SAMPLE NOTIFICATION: ${notification.title}`);
        await ctx.db.delete(notification._id);
        deletedCounts.notifications++;
      }
    }
    
    // 4. VERIFY FINAL STATE
    const remainingParents = await ctx.db.query("parents").collect();
    console.log(`🎉 CLEANUP COMPLETE! Remaining parents: ${remainingParents.length}`);
    console.log("📊 Deleted counts:", deletedCounts);
    
    return {
      success: true,
      deletedCounts,
      remainingParents: remainingParents.length,
      parentsList: remainingParents.map(p => ({ name: p.name, email: p.email }))
    };
  },
});