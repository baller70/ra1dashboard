import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Send payment reminder email
export const sendPaymentReminder = mutation({
  args: {
    installmentId: v.id("paymentInstallments"),
    reminderType: v.string(), // 'pre_due', 'overdue', 'grace_period'
  },
  handler: async (ctx, args) => {
    const installment = await ctx.db.get(args.installmentId);
    if (!installment) {
      throw new Error("Installment not found");
    }

    // Get parent information
    const parent = await ctx.db.get(installment.parentId);
    if (!parent) {
      throw new Error("Parent not found");
    }

    // Get parent payment for context
    const parentPayment = await ctx.db.get(installment.parentPaymentId);
    if (!parentPayment) {
      throw new Error("Parent payment not found");
    }

    const now = Date.now();
    
    // Create email content based on reminder type
    let subject: string;
    let body: string;

    switch (args.reminderType) {
      case 'pre_due':
        subject = `Payment Reminder: Payment #${installment.installmentNumber} Due Soon`;
        body = `
          Dear ${parent.name},
          
          This is a friendly reminder that your payment #${installment.installmentNumber} of $${(installment.amount / 100).toFixed(2)} is due on ${new Date(installment.dueDate).toLocaleDateString()}.
          
          Payment Details:
          - Amount: $${(installment.amount / 100).toFixed(2)}
          - Due Date: ${new Date(installment.dueDate).toLocaleDateString()}
          - Installment: ${installment.installmentNumber} of ${installment.totalInstallments}
          
          Please make your payment before the due date to avoid any late fees.
          
          Thank you,
          RA1 Basketball Program
        `;
        break;

      case 'overdue':
        subject = `OVERDUE: Payment #${installment.installmentNumber} - Action Required`;
        body = `
          Dear ${parent.name},
          
          Your payment #${installment.installmentNumber} of $${(installment.amount / 100).toFixed(2)} was due on ${new Date(installment.dueDate).toLocaleDateString()} and is now overdue.
          
          Payment Details:
          - Amount: $${(installment.amount / 100).toFixed(2)}
          - Original Due Date: ${new Date(installment.dueDate).toLocaleDateString()}
          - Days Overdue: ${Math.floor((now - installment.dueDate) / (1000 * 60 * 60 * 24))}
          - Installment: ${installment.installmentNumber} of ${installment.totalInstallments}
          
          GRACE PERIOD: You have 5 days from the due date to make this payment without penalty. 
          Grace period ends: ${new Date(installment.gracePeriodEnd || (installment.dueDate + 5 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
          
          Please make your payment immediately to avoid additional fees.
          
          Thank you,
          RA1 Basketball Program
        `;
        break;

      case 'grace_period':
        const daysInGrace = Math.floor((now - installment.dueDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = 5 - daysInGrace;
        
        subject = `URGENT: Grace Period Day ${daysInGrace} - Payment #${installment.installmentNumber}`;
        body = `
          Dear ${parent.name},
          
          URGENT: Your payment #${installment.installmentNumber} is in the grace period.
          
          Payment Details:
          - Amount: $${(installment.amount / 100).toFixed(2)}
          - Original Due Date: ${new Date(installment.dueDate).toLocaleDateString()}
          - Days Overdue: ${daysInGrace}
          - Days Remaining in Grace Period: ${daysRemaining}
          - Grace Period Ends: ${new Date(installment.gracePeriodEnd || (installment.dueDate + 5 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
          
          ${daysRemaining > 0 
            ? `You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining to make this payment without penalty.`
            : 'This is your FINAL DAY of the grace period. Additional fees may apply after today.'
          }
          
          Please make your payment immediately.
          
          Thank you,
          RA1 Basketball Program
        `;
        break;

      default:
        throw new Error("Invalid reminder type");
    }

    // Log the message in messageLogs table
    await ctx.db.insert("messageLogs", {
      parentId: parent._id,
      subject,
      content: body,
      body,
      type: "email",
      channel: "email",
      status: "sent",
      sentAt: now,
      createdAt: now,
      templateId: `payment_reminder_${args.reminderType}`,
      metadata: {
        installmentId: args.installmentId,
        reminderType: args.reminderType,
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
      }
    });

    // Update installment reminder count
    await ctx.db.patch(args.installmentId, {
      remindersSent: installment.remindersSent + 1,
      lastReminderSent: now,
      updatedAt: now,
    });

    return {
      success: true,
      emailSent: true,
      reminderType: args.reminderType,
      recipient: parent.email,
    };
  },
});

// Process all due reminders (called by cron job)
export const processPaymentReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const remindersSent = [];

    // Get all pending installments
    const pendingInstallments = await ctx.db
      .query("paymentInstallments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const installment of pendingInstallments) {
      const daysUntilDue = Math.floor((installment.dueDate - now) / oneDayMs);
      const daysOverdue = Math.floor((now - installment.dueDate) / oneDayMs);

      // Pre-due reminder (3 days before due date)
      if (daysUntilDue === 3 && installment.remindersSent === 0) {
        // Get parent information
        const parent = await ctx.db.get(installment.parentId);
        if (parent) {
          // Create pre-due reminder email
          const subject = `Payment Reminder: Payment #${installment.installmentNumber} Due Soon`;
          const body = `Dear ${parent.name}, your payment #${installment.installmentNumber} of $${(installment.amount / 100).toFixed(2)} is due on ${new Date(installment.dueDate).toLocaleDateString()}.`;
          
          // Log the message
          await ctx.db.insert("messageLogs", {
            parentId: parent._id,
            subject,
            content: body,
            body,
            type: "email",
            channel: "email",
            status: "sent",
            sentAt: now,
            createdAt: now,
            templateId: "payment_reminder_pre_due",
          });

          // Update installment
          await ctx.db.patch(installment._id, {
            remindersSent: installment.remindersSent + 1,
            lastReminderSent: now,
            updatedAt: now,
          });

          remindersSent.push({ type: "pre_due", installmentId: installment._id });
        }
      }

      // Overdue reminders
      if (daysOverdue > 0) {
        // Mark as overdue if not already
        if (installment.status !== "overdue") {
          await ctx.db.patch(installment._id, {
            status: "overdue",
            isInGracePeriod: true,
            gracePeriodEnd: installment.dueDate + (5 * oneDayMs),
            updatedAt: now,
          });
        }

        // Send daily grace period reminders
        if (daysOverdue <= 5) {
          // Check if we already sent a reminder today
          const lastReminderDate = installment.lastReminderSent 
            ? new Date(installment.lastReminderSent).toDateString()
            : null;
          const todayDate = new Date(now).toDateString();

          if (lastReminderDate !== todayDate) {
            const parent = await ctx.db.get(installment.parentId);
            if (parent) {
              const daysInGrace = Math.floor((now - installment.dueDate) / oneDayMs);
              const daysRemaining = 5 - daysInGrace;
              
              const subject = `URGENT: Grace Period Day ${daysInGrace} - Payment #${installment.installmentNumber}`;
              const body = `Dear ${parent.name}, your payment #${installment.installmentNumber} is ${daysInGrace} days overdue. You have ${daysRemaining} days remaining in the grace period.`;
              
              // Log the message
              await ctx.db.insert("messageLogs", {
                parentId: parent._id,
                subject,
                content: body,
                body,
                type: "email",
                channel: "email",
                status: "sent",
                sentAt: now,
                createdAt: now,
                templateId: "payment_reminder_grace_period",
              });

              // Update installment
              await ctx.db.patch(installment._id, {
                remindersSent: installment.remindersSent + 1,
                lastReminderSent: now,
                updatedAt: now,
              });

              remindersSent.push({ type: "grace_period", installmentId: installment._id });
            }
          }
        }

        // End grace period after 5 days
        if (daysOverdue > 5 && installment.isInGracePeriod) {
          await ctx.db.patch(installment._id, {
            isInGracePeriod: false,
            gracePeriodEnd: undefined,
            status: "failed", // or keep as overdue with penalties
            updatedAt: now,
          });
        }
      }
    }

    return {
      success: true,
      remindersSent: remindersSent.length,
      reminders: remindersSent,
    };
  },
});

// Get reminder statistics
export const getReminderStats = query({
  args: {
    parentId: v.optional(v.id("parents")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("messageLogs");

    if (args.parentId) {
      query = query.filter((q) => q.eq(q.field("parentId"), args.parentId));
    }

    const messages = await query.collect();

    // Filter by date range if provided
    let filteredMessages = messages;
    if (args.startDate || args.endDate) {
      filteredMessages = messages.filter((msg) => {
        const sentAt = msg.sentAt || msg.createdAt || 0;
        if (args.startDate && sentAt < args.startDate) return false;
        if (args.endDate && sentAt > args.endDate) return false;
        return true;
      });
    }

    // Filter for payment reminders only
    const paymentReminders = filteredMessages.filter((msg) => 
      msg.templateId?.startsWith("payment_reminder_")
    );

    const stats = {
      totalReminders: paymentReminders.length,
      preDueReminders: paymentReminders.filter((msg) => 
        msg.templateId === "payment_reminder_pre_due"
      ).length,
      overdueReminders: paymentReminders.filter((msg) => 
        msg.templateId === "payment_reminder_overdue"
      ).length,
      gracePeriodReminders: paymentReminders.filter((msg) => 
        msg.templateId === "payment_reminder_grace_period"
      ).length,
      byStatus: {
        sent: paymentReminders.filter((msg) => msg.status === "sent").length,
        failed: paymentReminders.filter((msg) => msg.status === "failed").length,
        pending: paymentReminders.filter((msg) => msg.status === "pending").length,
      },
    };

    return stats;
  },
}); 