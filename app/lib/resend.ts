import { Resend } from 'resend';
import { convexHttp } from './db'
import { api } from '../convex/_generated/api'
import { Id } from '../convex/_generated/dataModel'

// Make API key optional during build time
const apiKey = process.env.RESEND_API_KEY || 'placeholder-key-for-build';

if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('RESEND_API_KEY not provided - email features will be disabled');
}

export const resend = new Resend(apiKey);

// Email templates
export const emailTemplates = {
  paymentReminder: {
    subject: 'Payment Reminder - RA1 Basketball Program',
    template: (parentName: string, studentName: string, amount: number, dueDate: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">RA1 Basketball Program</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Payment Reminder</h2>
          
          <p style="font-size: 16px; color: #555;">Dear ${parentName},</p>
          
          <p style="font-size: 16px; color: #555;">
            This is a friendly reminder that a payment for <strong>${studentName}</strong> is due.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
            <p style="margin: 5px 0;"><strong>Student:</strong> ${studentName}</p>
          </div>
          
          <p style="font-size: 16px; color: #555;">
            Please make your payment as soon as possible to avoid any late fees.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Make Payment
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777;">
            If you have any questions, please contact us at support@ra1basketball.com
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2025 RA1 Basketball Program. All rights reserved.</p>
        </div>
      </div>
    `
  },

  overduePayment: {
    subject: 'Overdue Payment Notice - RA1 Basketball Program',
    template: (parentName: string, studentName: string, amount: number, daysPastDue: number) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">RA1 Basketball Program</h1>
        </div>
        
        <div style="padding: 30px; background-color: #fef2f2;">
          <h2 style="color: #dc2626;">Overdue Payment Notice</h2>
          
          <p style="font-size: 16px; color: #555;">Dear ${parentName},</p>
          
          <p style="font-size: 16px; color: #555;">
            We notice that a payment for <strong>${studentName}</strong> is now overdue by <strong>${daysPastDue} days</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${daysPastDue} days</p>
            <p style="margin: 5px 0;"><strong>Student:</strong> ${studentName}</p>
          </div>
          
          <p style="font-size: 16px; color: #555;">
            Please make your payment immediately to avoid any additional late fees or program suspension.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Pay Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777;">
            If you have any questions or need to set up a payment plan, please contact us immediately at support@ra1basketball.com
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2025 RA1 Basketball Program. All rights reserved.</p>
        </div>
      </div>
    `
  },

  paymentConfirmation: {
    subject: 'Payment Confirmation - RA1 Basketball Program',
    template: (parentName: string, studentName: string, amount: number, paymentDate: string, paymentMethod: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">RA1 Basketball Program</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f0fdf4;">
          <h2 style="color: #10b981;">Payment Confirmation</h2>
          
          <p style="font-size: 16px; color: #555;">Dear ${parentName},</p>
          
          <p style="font-size: 16px; color: #555;">
            Thank you! We have successfully received your payment for <strong>${studentName}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${amount.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${paymentDate}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p style="margin: 5px 0;"><strong>Student:</strong> ${studentName}</p>
          </div>
          
          <p style="font-size: 16px; color: #555;">
            Your payment has been processed and your account has been updated accordingly.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777;">
            If you have any questions about this payment, please contact us at support@ra1basketball.com
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2025 RA1 Basketball Program. All rights reserved.</p>
        </div>
      </div>
    `
  }
};

// Email service functions
export const emailService = {
  async sendPaymentReminder(
    to: string,
    parentName: string,
    studentName: string,
    amount: number,
    dueDate: string,
    parentId?: string
  ) {
    try {
      // Create message log entry first
      let messageId = null;
      if (parentId) {
        messageId = await convexHttp.mutation(api.messageLogs.createMessageLog, {
          parentId,
          subject: emailTemplates.paymentReminder.subject,
          body: `Payment reminder for ${studentName} - $${amount} due ${dueDate}`,
          content: emailTemplates.paymentReminder.template(parentName, studentName, amount, dueDate),
          channel: 'email',
          type: 'payment_reminder',
          status: 'sending',
          sentAt: Date.now(),
          metadata: {
            amount,
            dueDate,
            studentName,
            emailService: true
          }
        });
      }

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>',
        to: [to],
        subject: emailTemplates.paymentReminder.subject,
        html: emailTemplates.paymentReminder.template(parentName, studentName, amount, dueDate),
      });

      if (error) {
        // Update message status to failed if logging was enabled
        if (messageId && parentId) {
          await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
            id: messageId,
            status: 'failed',
            failureReason: error.message || 'Email sending failed',
            errorMessage: error
          });
        }
        console.error('Error sending payment reminder:', error);
        throw error;
      }

      // Update message status to sent if logging was enabled
      if (messageId && parentId) {
        await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        });

        // Create analytics entry
        await convexHttp.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId: messageId,
          parentId: parentId as Id<"parents">,
          channel: 'email',
          messageType: 'payment_reminder',
        });
      }

      return { success: true, data, messageId };
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      throw error;
    }
  },

  async sendOverdueNotice(
    to: string,
    parentName: string,
    studentName: string,
    amount: number,
    daysPastDue: number,
    parentId?: string
  ) {
    try {
      // Create message log entry first
      let messageId = null;
      if (parentId) {
        messageId = await convexHttp.mutation(api.messageLogs.createMessageLog, {
          parentId,
          subject: emailTemplates.overduePayment.subject,
          body: `Overdue payment notice for ${studentName} - $${amount} (${daysPastDue} days overdue)`,
          content: emailTemplates.overduePayment.template(parentName, studentName, amount, daysPastDue),
          channel: 'email',
          type: 'overdue_notice',
          status: 'sending',
          sentAt: Date.now(),
          metadata: {
            amount,
            daysPastDue,
            studentName,
            emailService: true
          }
        });
      }

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <noreply@ra1basketball.com>',
        to: [to],
        subject: emailTemplates.overduePayment.subject,
        html: emailTemplates.overduePayment.template(parentName, studentName, amount, daysPastDue),
      });

      if (error) {
        // Update message status to failed if logging was enabled
        if (messageId && parentId) {
          await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
            id: messageId,
            status: 'failed',
            failureReason: error.message || 'Email sending failed',
            errorMessage: error
          });
        }
        console.error('Error sending overdue notice:', error);
        throw error;
      }

      // Update message status to sent if logging was enabled
      if (messageId && parentId) {
        await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        });

        // Create analytics entry
        await convexHttp.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId: messageId,
          parentId: parentId as Id<"parents">,
          channel: 'email',
          messageType: 'overdue_notice',
        });
      }

      return { success: true, data, messageId };
    } catch (error) {
      console.error('Failed to send overdue notice:', error);
      throw error;
    }
  },

  async sendPaymentConfirmation(
    to: string,
    parentName: string,
    studentName: string,
    amount: number,
    paymentDate: string,
    paymentMethod: string = 'Credit Card',
    parentId?: string
  ) {
    try {
      // Create message log entry first
      let messageId = null;
      if (parentId) {
        messageId = await convexHttp.mutation(api.messageLogs.createMessageLog, {
          parentId,
          subject: emailTemplates.paymentConfirmation.subject,
          body: `Payment confirmation for ${studentName} - $${amount} paid via ${paymentMethod} on ${paymentDate}`,
          content: emailTemplates.paymentConfirmation.template(parentName, studentName, amount, paymentDate, paymentMethod),
          channel: 'email',
          type: 'payment_confirmation',
          status: 'sending',
          sentAt: Date.now(),
          metadata: {
            amount,
            paymentDate,
            paymentMethod,
            studentName,
            emailService: true
          }
        });
      }

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>',
        to: [to],
        subject: emailTemplates.paymentConfirmation.subject,
        html: emailTemplates.paymentConfirmation.template(parentName, studentName, amount, paymentDate, paymentMethod),
      });

      if (error) {
        // Update message status to failed if logging was enabled
        if (messageId && parentId) {
          await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
            id: messageId,
            status: 'failed',
            failureReason: error.message || 'Email sending failed',
            errorMessage: error
          });
        }
        console.error('Error sending payment confirmation:', error);
        throw error;
      }

      // Update message status to sent if logging was enabled
      if (messageId && parentId) {
        await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        });

        // Create analytics entry
        await convexHttp.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId: messageId,
          parentId: parentId as Id<"parents">,
          channel: 'email',
          messageType: 'payment_confirmation',
        });
      }

      return { success: true, data, messageId };
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      throw error;
    }
  },

  async sendCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    from?: string,
    parentId?: string
  ) {
    try {
      // Create message log entry first
      let messageId = null;
      if (parentId) {
        messageId = await convexHttp.mutation(api.messageLogs.createMessageLog, {
          parentId,
          subject,
          body: htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for body
          content: htmlContent,
          channel: 'email',
          type: 'custom_email',
          status: 'sending',
          sentAt: Date.now(),
          metadata: {
            customFrom: from,
            emailService: true
          }
        });
      }

      const { data, error } = await resend.emails.send({
        from: from || process.env.RESEND_FROM_EMAIL || 'RA1 Basketball <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlContent,
      });

      if (error) {
        // Update message status to failed if logging was enabled
        if (messageId && parentId) {
          await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
            id: messageId,
            status: 'failed',
            failureReason: error.message || 'Email sending failed',
            errorMessage: error
          });
        }
        console.error('Error sending custom email:', error);
        throw error;
      }

      // Update message status to sent if logging was enabled
      if (messageId && parentId) {
        await convexHttp.mutation(api.messageLogs.updateMessageStatus, {
          id: messageId,
          status: 'sent',
          deliveredAt: Date.now(),
        });

        // Create analytics entry
        await convexHttp.mutation(api.messageLogs.createMessageAnalytics, {
          messageLogId: messageId,
          parentId: parentId as Id<"parents">,
          channel: 'email',
          messageType: 'custom_email',
        });
      }

      return { success: true, data, messageId };
    } catch (error) {
      console.error('Error sending custom email:', error);
      throw error;
    }
  }
}; 