import { mutation, query } from "./_generated/server";

// COMPREHENSIVE CLEANUP: Remove ALL test/sample data from entire database
export const removeAllTestData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Starting COMPREHENSIVE cleanup of ALL test/sample data...");
    
    let deletedCounts = {
      parents: 0,
      paymentPlans: 0,
      payments: 0,
      installments: 0,
      messageLogs: 0,
      notifications: 0,
      templates: 0,
      users: 0,
      contracts: 0
    };

    // Define REAL Houston family data
    const realParentEmails = [
      "khouston721@gmail.com",  // Kevin Houston
      "khouston@gmail.com",     // Casey Houston  
      "khous7@gmail.com",       // Nate Houston
      "khouston75621@gmail.com", // Matt Houston
      "khouston767521@gmail.com" // Payton Houston
    ];
    
    const realParentNames = [
      "Kevin Houston",
      "Casey Houston", 
      "Nate Houston",
      "matt Houston",
      "Payton Houston"
    ];

    // 1. IDENTIFY AND DELETE TEST PARENTS
    const allParents = await ctx.db.query("parents").collect();
    const realParents = allParents.filter(parent => 
      realParentEmails.includes(parent.email) || 
      realParentNames.includes(parent.name)
    );
    const testParents = allParents.filter(parent => 
      !realParentEmails.includes(parent.email) && 
      !realParentNames.includes(parent.name)
    );
    
    const testParentIds = testParents.map(p => p._id);
    console.log(`✅ Real parents: ${realParents.length}, ❌ Test parents: ${testParents.length}`);

    // 2. DELETE SAMPLE/TEST NOTIFICATIONS (with metadata.sample: true)
    const allNotifications = await ctx.db.query("notifications").collect();
    for (const notification of allNotifications) {
      // Delete if it has sample metadata OR belongs to test parent
      const isSample = notification.metadata && (notification.metadata as any).sample === true;
      const belongsToTestParent = notification.parentId && testParentIds.includes(notification.parentId);
      
      if (isSample || belongsToTestParent) {
        await ctx.db.delete(notification._id);
        deletedCounts.notifications++;
      }
    }

    // 3. DELETE TEST TEMPLATES (containing test data indicators)
    const allTemplates = await ctx.db.query("templates").collect();
    for (const template of allTemplates) {
      // Delete templates with test indicators in name or content
      const hasTestIndicators = 
        template.name?.toLowerCase().includes('test') ||
        template.name?.toLowerCase().includes('sample') ||
        template.name?.toLowerCase().includes('demo') ||
        template.content?.toLowerCase().includes('test') ||
        template.content?.toLowerCase().includes('sample') ||
        template.content?.toLowerCase().includes('demo');
      
      if (hasTestIndicators) {
        await ctx.db.delete(template._id);
        deletedCounts.templates++;
      }
    }

    // 4. DELETE TEST PAYMENT PLANS
    const allPaymentPlans = await ctx.db.query("paymentPlans").collect();
    for (const plan of allPaymentPlans) {
      if (testParentIds.includes(plan.parentId)) {
        await ctx.db.delete(plan._id);
        deletedCounts.paymentPlans++;
      }
    }

    // 5. DELETE TEST PAYMENTS
    const allPayments = await ctx.db.query("payments").collect();
    for (const payment of allPayments) {
      if (testParentIds.includes(payment.parentId)) {
        await ctx.db.delete(payment._id);
        deletedCounts.payments++;
      }
    }

    // 6. DELETE TEST PAYMENT INSTALLMENTS
    const allInstallments = await ctx.db.query("paymentInstallments").collect();
    for (const installment of allInstallments) {
      if (testParentIds.includes(installment.parentId)) {
        await ctx.db.delete(installment._id);
        deletedCounts.installments++;
      }
    }

    // 7. DELETE TEST MESSAGE LOGS
    const allMessageLogs = await ctx.db.query("messageLogs").collect();
    for (const log of allMessageLogs) {
      if (testParentIds.includes(log.parentId)) {
        await ctx.db.delete(log._id);
        deletedCounts.messageLogs++;
      }
    }

    // 8. DELETE TEST CONTRACTS
    const allContracts = await ctx.db.query("contracts").collect();
    for (const contract of allContracts) {
      if (testParentIds.includes(contract.parentId)) {
        await ctx.db.delete(contract._id);
        deletedCounts.contracts++;
      }
    }

    // 9. DELETE TEST USERS (keep only Houston family)
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      const isRealUser = 
        realParentEmails.includes(user.email) ||
        user.email === "dev@thebasketballfactoryinc.com" ||
        user.role === "admin";
      
      if (!isRealUser) {
        await ctx.db.delete(user._id);
        deletedCounts.users++;
      }
    }

    // 10. FINALLY DELETE TEST PARENTS
    for (const parent of testParents) {
      await ctx.db.delete(parent._id);
      deletedCounts.parents++;
    }

    console.log("🎉 COMPREHENSIVE cleanup completed!");
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

// VERIFICATION: Check what remains after cleanup
export const verifyNoTestData = query({
  args: {},
  handler: async (ctx) => {
    const parents = await ctx.db.query("parents").collect();
    const paymentPlans = await ctx.db.query("paymentPlans").collect();
    const payments = await ctx.db.query("payments").collect();
    const notifications = await ctx.db.query("notifications").collect();
    const templates = await ctx.db.query("templates").collect();
    
    // Check for any remaining test data
    const sampleNotifications = notifications.filter(n => 
      n.metadata && (n.metadata as any).sample === true
    );
    
    const testTemplates = templates.filter(t => 
      t.name?.toLowerCase().includes('test') ||
      t.name?.toLowerCase().includes('sample') ||
      t.content?.toLowerCase().includes('test')
    );

    console.log("📊 VERIFICATION - Data remaining after cleanup:");
    console.log(`Parents: ${parents.length}`);
    console.log(`Payment Plans: ${paymentPlans.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Notifications: ${notifications.length}`);
    console.log(`Templates: ${templates.length}`);
    console.log(`❌ Sample notifications still found: ${sampleNotifications.length}`);
    console.log(`❌ Test templates still found: ${testTemplates.length}`);

    return {
      parents: parents.length,
      paymentPlans: paymentPlans.length,
      payments: payments.length,
      notifications: notifications.length,
      templates: templates.length,
      remainingTestData: {
        sampleNotifications: sampleNotifications.length,
        testTemplates: testTemplates.length
      },
      parentsList: parents.map(p => ({ name: p.name, email: p.email })),
      isClean: sampleNotifications.length === 0 && testTemplates.length === 0
    };
  },
});