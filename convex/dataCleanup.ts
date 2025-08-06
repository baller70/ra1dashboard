import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Data cleanup and organization functions for analytics accuracy

// Remove ALL test data and keep only real Houston family data
export const removeTestDataKeepReal = mutation({
  args: { confirm: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.confirm) {
      return { error: "Must confirm cleanup by passing confirm: true" };
    }
    
    console.log("🧹 Starting removal of ALL test data...");
    
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
      installments: 0
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
    
    // 4. Finally delete test parents
    for (const parent of testParents) {
      await ctx.db.delete(parent._id);
      deletedCounts.parents++;
    }
    
    console.log("🎉 Test data cleanup completed!");
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

// Check data integrity and identify issues
export const analyzeDataIntegrity = query({
  args: {},
  handler: async (ctx) => {
    const [parents, payments, paymentPlans, installments, messageLogs] = await Promise.all([
      ctx.db.query("parents").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("paymentPlans").collect(),
      ctx.db.query("paymentInstallments").collect(),
      ctx.db.query("messageLogs").collect()
    ]);

    // Check for orphaned records and data inconsistencies
    const issues = [];
    
    // 1. Check for payments without valid parent IDs
    const orphanedPayments = payments.filter(payment => {
      if (!payment.parentId) return true;
      const parent = parents.find(p => p._id === payment.parentId);
      return !parent;
    });
    
    if (orphanedPayments.length > 0) {
      issues.push({
        type: 'orphaned_payments',
        count: orphanedPayments.length,
        description: 'Payments with invalid or missing parent IDs',
        records: orphanedPayments.map(p => ({ id: p._id, parentId: p.parentId, amount: p.amount }))
      });
    }

    // 2. Check for payment plans without valid parent IDs
    const orphanedPaymentPlans = paymentPlans.filter(plan => {
      if (!plan.parentId) return true;
      const parent = parents.find(p => p._id === plan.parentId);
      return !parent;
    });
    
    if (orphanedPaymentPlans.length > 0) {
      issues.push({
        type: 'orphaned_payment_plans',
        count: orphanedPaymentPlans.length,
        description: 'Payment plans with invalid or missing parent IDs',
        records: orphanedPaymentPlans.map(p => ({ id: p._id, parentId: p.parentId, totalAmount: p.totalAmount }))
      });
    }

    // 3. Check for installments without valid parent payment IDs
    const orphanedInstallments = installments.filter(installment => {
      const payment = payments.find(p => p._id === installment.parentPaymentId);
      return !payment;
    });
    
    if (orphanedInstallments.length > 0) {
      issues.push({
        type: 'orphaned_installments',
        count: orphanedInstallments.length,
        description: 'Installments with invalid parent payment IDs',
        records: orphanedInstallments.map(i => ({ id: i._id, parentPaymentId: i.parentPaymentId, amount: i.amount }))
      });
    }

    // 4. Check for message logs without valid parent IDs
    const orphanedMessages = messageLogs.filter(message => {
      if (!message.parentId) return true;
      const parent = parents.find(p => p._id === message.parentId);
      return !parent;
    });
    
    if (orphanedMessages.length > 0) {
      issues.push({
        type: 'orphaned_messages',
        count: orphanedMessages.length,
        description: 'Message logs with invalid or missing parent IDs',
        records: orphanedMessages.slice(0, 10).map(m => ({ id: m._id, parentId: m.parentId, subject: m.subject }))
      });
    }

    // 5. Check for payments with payment plans but no installments
    const paymentsWithPlansButNoInstallments = payments.filter(payment => {
      if (!payment.paymentPlanId) return false;
      const hasInstallments = installments.some(i => i.parentPaymentId === payment._id);
      return !hasInstallments;
    });
    
    if (paymentsWithPlansButNoInstallments.length > 0) {
      issues.push({
        type: 'payments_missing_installments',
        count: paymentsWithPlansButNoInstallments.length,
        description: 'Payments with payment plans but no installments',
        records: paymentsWithPlansButNoInstallments.map(p => ({ id: p._id, paymentPlanId: p.paymentPlanId, amount: p.amount }))
      });
    }

    // 6. Check for inconsistent payment statuses
    const inconsistentPaymentStatuses = payments.filter(payment => {
      const paymentInstallments = installments.filter(i => i.parentPaymentId === payment._id);
      if (paymentInstallments.length === 0) return false;
      
      const allPaid = paymentInstallments.every(i => i.status === 'paid');
      const anyOverdue = paymentInstallments.some(i => i.status === 'overdue');
      
      // Payment should be marked as paid if all installments are paid
      if (allPaid && payment.status !== 'paid') return true;
      // Payment should be marked as overdue if any installment is overdue
      if (anyOverdue && payment.status !== 'overdue') return true;
      
      return false;
    });
    
    if (inconsistentPaymentStatuses.length > 0) {
      issues.push({
        type: 'inconsistent_payment_statuses',
        count: inconsistentPaymentStatuses.length,
        description: 'Payments with statuses that don\'t match their installments',
        records: inconsistentPaymentStatuses.map(p => ({ id: p._id, status: p.status, amount: p.amount }))
      });
    }

    // Summary statistics
    const summary = {
      totalParents: parents.length,
      totalPayments: payments.length,
      totalPaymentPlans: paymentPlans.length,
      totalInstallments: installments.length,
      totalMessages: messageLogs.length,
      totalIssues: issues.length,
      issueTypes: issues.map(i => i.type),
      dataQualityScore: Math.max(0, 100 - (issues.length * 5)) // Rough quality score
    };

    return {
      summary,
      issues,
      recommendations: issues.length > 0 ? [
        'Run the cleanupOrphanedRecords mutation to remove orphaned records',
        'Run the syncPaymentStatuses mutation to fix inconsistent statuses',
        'Consider running a full data validation after cleanup'
      ] : ['Data integrity looks good! No major issues found.']
    };
  },
});

// Clean up orphaned records
export const cleanupOrphanedRecords = mutation({
  args: {
    confirmCleanup: v.boolean(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    if (!args.confirmCleanup) {
      throw new Error("Must confirm cleanup by setting confirmCleanup to true");
    }

    const dryRun = args.dryRun || false;
    const cleanupResults = [];

    // Get all data
    const [parents, payments, paymentPlans, installments, messageLogs] = await Promise.all([
      ctx.db.query("parents").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("paymentPlans").collect(),
      ctx.db.query("paymentInstallments").collect(),
      ctx.db.query("messageLogs").collect()
    ]);

    // 1. Clean up payments with invalid parent IDs
    const orphanedPayments = payments.filter(payment => {
      if (!payment.parentId) return true;
      const parent = parents.find(p => p._id === payment.parentId);
      return !parent;
    });

    if (orphanedPayments.length > 0) {
      cleanupResults.push({
        type: 'orphaned_payments',
        count: orphanedPayments.length,
        action: dryRun ? 'would_delete' : 'deleted'
      });

      if (!dryRun) {
        for (const payment of orphanedPayments) {
          await ctx.db.delete(payment._id);
        }
      }
    }

    // 2. Clean up payment plans with invalid parent IDs
    const orphanedPaymentPlans = paymentPlans.filter(plan => {
      if (!plan.parentId) return true;
      const parent = parents.find(p => p._id === plan.parentId);
      return !parent;
    });

    if (orphanedPaymentPlans.length > 0) {
      cleanupResults.push({
        type: 'orphaned_payment_plans',
        count: orphanedPaymentPlans.length,
        action: dryRun ? 'would_delete' : 'deleted'
      });

      if (!dryRun) {
        for (const plan of orphanedPaymentPlans) {
          await ctx.db.delete(plan._id);
        }
      }
    }

    // 3. Clean up installments with invalid parent payment IDs
    const orphanedInstallments = installments.filter(installment => {
      const payment = payments.find(p => p._id === installment.parentPaymentId);
      return !payment;
    });

    if (orphanedInstallments.length > 0) {
      cleanupResults.push({
        type: 'orphaned_installments',
        count: orphanedInstallments.length,
        action: dryRun ? 'would_delete' : 'deleted'
      });

      if (!dryRun) {
        for (const installment of orphanedInstallments) {
          await ctx.db.delete(installment._id);
        }
      }
    }

    // 4. Clean up message logs with invalid parent IDs (be more careful here)
    const orphanedMessages = messageLogs.filter(message => {
      if (!message.parentId) return true;
      const parent = parents.find(p => p._id === message.parentId);
      return !parent;
    });

    if (orphanedMessages.length > 0) {
      cleanupResults.push({
        type: 'orphaned_messages',
        count: orphanedMessages.length,
        action: dryRun ? 'would_delete' : 'deleted'
      });

      if (!dryRun) {
        // Only delete messages older than 30 days to preserve recent data
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        for (const message of orphanedMessages) {
          if (message.createdAt && message.createdAt < thirtyDaysAgo) {
            await ctx.db.delete(message._id);
          }
        }
      }
    }

    return {
      success: true,
      dryRun,
      cleanupResults,
      totalRecordsProcessed: cleanupResults.reduce((sum, result) => sum + result.count, 0),
      message: dryRun 
        ? 'Dry run completed - no records were actually deleted'
        : 'Cleanup completed successfully'
    };
  },
});

// Sync payment statuses based on installments
export const syncPaymentStatuses = mutation({
  args: {
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun || false;
    const now = Date.now();
    
    const [payments, installments] = await Promise.all([
      ctx.db.query("payments").collect(),
      ctx.db.query("paymentInstallments").collect()
    ]);

    const updates = [];

    for (const payment of payments) {
      const paymentInstallments = installments.filter(i => i.parentPaymentId === payment._id);
      
      if (paymentInstallments.length === 0) continue;

      let newStatus = payment.status;
      let shouldUpdate = false;

      // Determine correct status based on installments
      const allPaid = paymentInstallments.every(i => i.status === 'paid');
      const anyOverdue = paymentInstallments.some(i => 
        i.status === 'overdue' || (i.status === 'pending' && i.dueDate < now)
      );
      const anyPending = paymentInstallments.some(i => i.status === 'pending');

      if (allPaid && payment.status !== 'paid') {
        newStatus = 'paid';
        shouldUpdate = true;
      } else if (anyOverdue && payment.status !== 'overdue') {
        newStatus = 'overdue';
        shouldUpdate = true;
      } else if (anyPending && !anyOverdue && payment.status !== 'active') {
        newStatus = 'active';
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        updates.push({
          paymentId: payment._id,
          oldStatus: payment.status,
          newStatus: newStatus,
          installmentCount: paymentInstallments.length
        });

        if (!dryRun) {
          await ctx.db.patch(payment._id, {
            status: newStatus,
            updatedAt: now
          });
        }
      }
    }

    return {
      success: true,
      dryRun,
      updatesCount: updates.length,
      updates: updates.slice(0, 20), // Return first 20 for review
      message: dryRun 
        ? `Would update ${updates.length} payment statuses`
        : `Updated ${updates.length} payment statuses`
    };
  },
});

// Validate installment data consistency
export const validateInstallmentData = query({
  args: {},
  handler: async (ctx) => {
    const [payments, installments] = await Promise.all([
      ctx.db.query("payments").collect(),
      ctx.db.query("paymentInstallments").collect()
    ]);

    const issues = [];
    const now = Date.now();

    for (const payment of payments) {
      const paymentInstallments = installments.filter(i => i.parentPaymentId === payment._id);
      
      if (paymentInstallments.length === 0) continue;

      // Check if installment amounts add up to payment amount
      const totalInstallmentAmount = paymentInstallments.reduce((sum, i) => sum + i.amount, 0);
      if (Math.abs(totalInstallmentAmount - (payment.amount || 0)) > 0.01) {
        issues.push({
          type: 'amount_mismatch',
          paymentId: payment._id,
          paymentAmount: payment.amount,
          installmentTotal: totalInstallmentAmount,
          difference: totalInstallmentAmount - (payment.amount || 0)
        });
      }

      // Check for installments with invalid statuses
      const invalidStatusInstallments = paymentInstallments.filter(i => 
        !['pending', 'paid', 'overdue', 'failed'].includes(i.status)
      );
      
      if (invalidStatusInstallments.length > 0) {
        issues.push({
          type: 'invalid_status',
          paymentId: payment._id,
          invalidInstallments: invalidStatusInstallments.map(i => ({ id: i._id, status: i.status }))
        });
      }

      // Check for overdue installments not marked as overdue
      const shouldBeOverdue = paymentInstallments.filter(i => 
        i.status === 'pending' && i.dueDate < now
      );
      
      if (shouldBeOverdue.length > 0) {
        issues.push({
          type: 'should_be_overdue',
          paymentId: payment._id,
          installments: shouldBeOverdue.map(i => ({ 
            id: i._id, 
            dueDate: i.dueDate,
            daysOverdue: Math.floor((now - i.dueDate) / (1000 * 60 * 60 * 24))
          }))
        });
      }
    }

    return {
      totalPayments: payments.length,
      totalInstallments: installments.length,
      issuesFound: issues.length,
      issues: issues.slice(0, 10), // Return first 10 for review
      summary: {
        amountMismatches: issues.filter(i => i.type === 'amount_mismatch').length,
        invalidStatuses: issues.filter(i => i.type === 'invalid_status').length,
        shouldBeOverdue: issues.filter(i => i.type === 'should_be_overdue').length
      }
    };
  },
});

// Update overdue installments
export const updateOverdueInstallments = mutation({
  args: {
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun || false;
    const now = Date.now();
    
    const installments = await ctx.db.query("paymentInstallments").collect();
    
    const overdueInstallments = installments.filter(i => 
      i.status === 'pending' && i.dueDate < now
    );

    const updates = [];
    
    for (const installment of overdueInstallments) {
      const daysOverdue = Math.floor((now - installment.dueDate) / (1000 * 60 * 60 * 24));
      
      updates.push({
        installmentId: installment._id,
        parentPaymentId: installment.parentPaymentId,
        daysOverdue,
        oldStatus: installment.status
      });

      if (!dryRun) {
        await ctx.db.patch(installment._id, {
          status: 'overdue',
          updatedAt: now
        });
      }
    }

    return {
      success: true,
      dryRun,
      updatedCount: updates.length,
      updates: updates.slice(0, 20),
      message: dryRun 
        ? `Would mark ${updates.length} installments as overdue`
        : `Marked ${updates.length} installments as overdue`
    };
  },
});