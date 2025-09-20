import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@riseasone.com';
const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL || 'support@riseasone.com';

// Template rendering function
export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  
  // Replace variables in format {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }
  
  return rendered;
}

// Send single email
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  metadata,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  metadata?: Record<string, string>;
}) {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || text || '',
      text: text,
      reply_to: replyTo || REPLY_TO_EMAIL,
      headers: metadata ? {
        'X-Metadata': JSON.stringify(metadata),
      } : undefined,
    });

    return {
      success: true,
      messageId: result.data?.id,
      result,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Send templated email
export async function sendTemplatedEmail({
  to,
  templateId,
  variables,
  metadata,
}: {
  to: string | string[];
  templateId: string;
  variables: Record<string, any>;
  metadata?: Record<string, string>;
}) {
  try {
    // Get template from database (assuming we have a template system)
    const template = await getEmailTemplate(templateId);
    
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
      };
    }

    const renderedSubject = renderTemplate(template.subject, variables);
    const renderedHtml = renderTemplate(template.content, variables);
    const renderedText = template.textContent ? renderTemplate(template.textContent, variables) : undefined;

    return await sendEmail({
      to,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      metadata: {
        templateId,
        ...metadata,
      },
    });
  } catch (error) {
    console.error('Templated email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send templated email',
    };
  }
}

// Send bulk emails
export async function sendBulkEmails({
  emails,
  batchSize = 50,
}: {
  emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    metadata?: Record<string, string>;
  }>;
  batchSize?: number;
}) {
  const results: Array<{
    success: boolean;
    email: string;
    messageId?: string;
    error?: string;
  }> = [];

  // Process emails in batches to avoid rate limits
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (emailData) => {
      const result = await sendEmail(emailData);
      return {
        success: result.success,
        email: emailData.to,
        messageId: result.messageId,
        error: result.error,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    success: failed === 0,
    total: emails.length,
    successful,
    failed,
    results,
  };
}

// Send bulk templated emails
export async function sendBulkTemplatedEmails({
  recipients,
  templateId,
  batchSize = 50,
}: {
  recipients: Array<{
    email: string;
    variables: Record<string, any>;
    metadata?: Record<string, string>;
  }>;
  templateId: string;
  batchSize?: number;
}) {
  try {
    // Get template from database
    const template = await getEmailTemplate(templateId);
    
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
      };
    }

    // Prepare emails with rendered content
    const emails = recipients.map(recipient => {
      const renderedSubject = renderTemplate(template.subject, recipient.variables);
      const renderedHtml = renderTemplate(template.content, recipient.variables);
      const renderedText = template.textContent ? renderTemplate(template.textContent, recipient.variables) : undefined;

      return {
        to: recipient.email,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
        metadata: {
          templateId,
          ...recipient.metadata,
        },
      };
    });

    return await sendBulkEmails({ emails, batchSize });
  } catch (error) {
    console.error('Bulk templated email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send bulk templated emails',
    };
  }
}

// Payment reminder email
// Note: parentName should be the emergency contact first name
export async function sendPaymentReminderEmail({
  parentEmail,
  parentName,
  amount,
  dueDate,
  paymentPlanName,
  daysPastDue = 0,
}: {
  parentEmail: string;
  parentName: string; // This should be the emergency contact first name
  amount: number;
  dueDate: Date;
  paymentPlanName?: string;
  daysPastDue?: number;
}) {
  const isOverdue = daysPastDue > 0;
  const subject = isOverdue 
    ? `OVERDUE: Payment Reminder - Rise as One Basketball Program`
    : `Payment Reminder - Rise as One Basketball Program`;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Rise as One Basketball Program</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${isOverdue ? 'Overdue Payment Notice' : 'Payment Reminder'}</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Dear ${parentName},</p>
        
        ${isOverdue ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">
              Your payment is ${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue.
            </p>
          </div>
        ` : ''}
        
        <p style="font-size: 16px; line-height: 1.6;">
          This is a ${isOverdue ? 'notice that your' : 'friendly reminder that a'} payment for the Rise as One Basketball Program ${isOverdue ? 'is overdue' : 'is due soon'}.
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af;">Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
              <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #1e40af;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; text-align: right;">${formattedDueDate}</td>
            </tr>
            ${paymentPlanName ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Payment Plan:</td>
                <td style="padding: 8px 0; text-align: right;">${paymentPlanName}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">
          Please make your payment as soon as possible to avoid any interruption to your child's participation in the program.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Make Payment Now
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
          If you have any questions about this payment or need to discuss payment arrangements, please don't hesitate to contact us at ${REPLY_TO_EMAIL}.
        </p>
        
        <p style="font-size: 16px; margin-top: 30px;">
          Thank you for your continued support of the Rise as One Basketball Program!
        </p>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Rise as One Basketball Program Team</strong>
        </p>
      </div>
    </div>
  `;

  const text = `
    Rise as One Basketball Program - ${isOverdue ? 'Overdue Payment Notice' : 'Payment Reminder'}
    
    Dear ${parentName},
    
    ${isOverdue ? `Your payment is ${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue.` : ''}
    
    This is a ${isOverdue ? 'notice that your' : 'friendly reminder that a'} payment for the Rise as One Basketball Program ${isOverdue ? 'is overdue' : 'is due soon'}.
    
    Payment Details:
    - Amount Due: ${formattedAmount}
    - Due Date: ${formattedDueDate}
    ${paymentPlanName ? `- Payment Plan: ${paymentPlanName}` : ''}
    
    Please make your payment as soon as possible to avoid any interruption to your child's participation in the program.
    
    If you have any questions about this payment or need to discuss payment arrangements, please contact us at ${REPLY_TO_EMAIL}.
    
    Thank you for your continued support of the Rise as One Basketball Program!
    
    Best regards,
    Rise as One Basketball Program Team
  `;

  return await sendEmail({
    to: parentEmail,
    subject,
    html,
    text,
    metadata: {
      type: 'payment_reminder',
      amount: amount.toString(),
      dueDate: dueDate.toISOString(),
      isOverdue: isOverdue.toString(),
      daysPastDue: daysPastDue.toString(),
    },
  });
}

// Welcome email for new parents
// Note: parentName should be the emergency contact first name
export async function sendWelcomeEmail({
  parentEmail,
  parentName,
}: {
  parentEmail: string;
  parentName: string; // This should be the emergency contact first name
}) {
  const subject = 'Welcome to Rise as One Basketball Program!';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Welcome to Rise as One!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Basketball Program</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Dear ${parentName},</p>
        
        <p style="font-size: 16px; line-height: 1.6;">
          Welcome to the Rise as One Basketball Program! We're excited to have your child join our basketball family.
        </p>
        
        <p style="font-size: 16px; line-height: 1.6;">
          Our program is designed to help young athletes develop their basketball skills, build character, and create lasting friendships. We're committed to providing a positive and supportive environment where every player can thrive.
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af;">What's Next?</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>You'll receive payment information and schedules soon</li>
            <li>Keep an eye out for practice schedules and important updates</li>
            <li>Don't hesitate to reach out with any questions</li>
          </ul>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">
          If you have any questions or need assistance, please don't hesitate to contact us at ${REPLY_TO_EMAIL}.
        </p>
        
        <p style="font-size: 16px; margin-top: 30px;">
          We look forward to an amazing season!
        </p>
        
        <p style="font-size: 16px;">
          Best regards,<br>
          <strong>Rise as One Basketball Program Team</strong>
        </p>
      </div>
    </div>
  `;

  const text = `
    Welcome to Rise as One Basketball Program!
    
    Dear ${parentName},
    
    Welcome to the Rise as One Basketball Program! We're excited to have your child join our basketball family.
    
    Our program is designed to help young athletes develop their basketball skills, build character, and create lasting friendships. We're committed to providing a positive and supportive environment where every player can thrive.
    
    What's Next?
    - You'll receive payment information and schedules soon
    - Keep an eye out for practice schedules and important updates
    - Don't hesitate to reach out with any questions
    
    If you have any questions or need assistance, please contact us at ${REPLY_TO_EMAIL}.
    
    We look forward to an amazing season!
    
    Best regards,
    Rise as One Basketball Program Team
  `;

  return await sendEmail({
    to: parentEmail,
    subject,
    html,
    text,
    metadata: {
      type: 'welcome',
    },
  });
}

// Helper function to get email template from database
async function getEmailTemplate(templateId: string) {
  // This would typically fetch from your database
  // For now, return a basic template structure
  const templates: Record<string, { subject: string; content: string; textContent?: string }> = {
    'payment_reminder': {
      subject: 'Payment Reminder - {{programName}}',
      content: `
        <p>Dear {{parentName}},</p>
        <p>This is a reminder that your payment of {{amount}} is due on {{dueDate}}.</p>
        <p>Thank you!</p>
      `,
      textContent: 'Dear {{parentName}}, This is a reminder that your payment of {{amount}} is due on {{dueDate}}. Thank you!',
    },
    'welcome': {
      subject: 'Welcome to {{programName}}!',
      content: `
        <p>Dear {{parentName}},</p>
        <p>Welcome to {{programName}}! We're excited to have you join us.</p>
        <p>Best regards!</p>
      `,
    },
  };

  return templates[templateId] || null;
}

// Email delivery status tracking
export async function getEmailDeliveryStatus(messageId: string) {
  // This would integrate with Resend's webhook system
  // For now, return a placeholder
  return {
    messageId,
    status: 'delivered', // delivered, bounced, complained, etc.
    timestamp: new Date(),
  };
} 