
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { convexHttp } from '../../../../lib/db';
import { api } from '../../../../convex/_generated/api';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const bulkSendSchema = z.object({
  parentIds: z.array(z.string()),
  templateId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  channel: z.enum(['email', 'sms']).default('email'),
  messageType: z.enum(['payment_reminder', 'welcome', 'custom']).default('custom'),
  customizePerParent: z.boolean().default(true),
});

// Helper function for error handling
function handleError(error: any, message: string) {
  console.error(message, error);
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid data', details: error.errors },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = bulkSendSchema.parse(body);

    const { parentIds, templateId, subject, body: messageBody, channel, messageType, customizePerParent } = validatedData;

    if (parentIds.length === 0) {
      return NextResponse.json({ error: 'Parent IDs are required' }, { status: 400 });
    }

    if (messageType === 'custom' && (!subject || !messageBody)) {
      return NextResponse.json({ error: 'Subject and body are required for custom messages' }, { status: 400 });
    }

    // Get parent information from Convex
    const parentsResponse = await convexHttp.query(api.parents.getParents, {});
    const allParents = parentsResponse.parents;
    
    const parents = allParents.filter(parent => parentIds.includes(parent._id));

    if (parents.length === 0) {
      return NextResponse.json({ error: 'No valid parents found' }, { status: 400 });
    }

    // Get template if provided
    let template = null;
    if (templateId) {
      try {
        template = await convexHttp.query(api.templates.getTemplate, {
          id: templateId as any
        });
      } catch (error) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    const results = [];
    const messageLogs = [];

    // Process each parent
    for (const parent of parents) {
      try {
        let personalizedSubject = subject || template?.subject || 'Message from Rise as One';
        let personalizedBody = messageBody || template?.body || '';

        if (customizePerParent) {
          // Replace template variables
          personalizedSubject = personalizedSubject.replace(/\{parentName\}/g, parent.name || 'Parent');
          personalizedSubject = personalizedSubject.replace(/\{parentEmail\}/g, parent.email);
          
          personalizedBody = personalizedBody.replace(/\{parentName\}/g, parent.name || 'Parent');
          personalizedBody = personalizedBody.replace(/\{parentEmail\}/g, parent.email);
          personalizedBody = personalizedBody.replace(/\{parentPhone\}/g, parent.phone || 'N/A');
        }

        // Actually send the email via Resend
        let sendResult = null;
        let messageStatus = 'failed';
        let errorMessage = null;

        if (channel === 'email' && parent.email) {
          try {
            sendResult = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL!,
              to: parent.email,
              subject: personalizedSubject,
              text: personalizedBody,
            });
            messageStatus = 'sent';
            console.log(`Email sent to ${parent.email}:`, sendResult);
          } catch (emailError) {
            console.error(`Failed to send email to ${parent.email}:`, emailError);
            errorMessage = emailError instanceof Error ? emailError.message : 'Email send failed';
            messageStatus = 'failed';
          }
        } else if (channel === 'sms') {
          // SMS integration would go here
          messageStatus = 'pending';
          errorMessage = 'SMS integration not yet implemented';
        }

        // Save message log to Convex database
        const messageLogId = await convexHttp.mutation(api.messageLogs.createMessageLog, {
          parentId: parent._id,
          templateId: templateId || undefined,
          subject: personalizedSubject,
          body: personalizedBody,
          content: personalizedBody,
          channel,
          type: messageType,
          status: messageStatus,
          sentAt: Date.now(),
          metadata: {
            messageType,
            actualSend: true,
            resendId: sendResult?.data?.id || undefined,
          },
        });

        const messageLog = {
          id: messageLogId,
          parentId: parent._id,
          templateId: templateId || null,
          subject: personalizedSubject,
          body: personalizedBody,
          channel,
          status: messageStatus,
          sentAt: new Date(),
          resendId: sendResult?.data?.id || null,
          metadata: {
            messageType,
            actualSend: true,
          },
        };

        messageLogs.push(messageLog);
        
        if (messageStatus === 'sent') {
          results.push({
            parentId: parent._id,
            parentName: parent.name,
            parentEmail: parent.email,
            success: true,
            messageId: messageLog.id,
            resendId: sendResult?.data?.id,
            message: `Email sent successfully to ${parent.email}`,
          });
        } else {
          results.push({
            parentId: parent._id,
            parentName: parent.name,
            parentEmail: parent.email,
            success: false,
            messageId: messageLog.id,
            error: errorMessage || 'Unknown error',
            message: `Failed to send ${channel} to ${parent.name}`,
          });
        }

      } catch (error) {
        console.error(`Error processing parent ${parent._id}:`, error);
        results.push({
          parentId: parent._id,
          parentName: parent.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update template usage count if template was used
    if (templateId && template) {
      try {
        const successfulCount = results.filter(r => r.success).length;
        for (let i = 0; i < successfulCount; i++) {
          await convexHttp.mutation(api.templates.incrementTemplateUsage, {
            id: template._id
          });
        }
      } catch (error) {
        console.error('Failed to update template usage count:', error);
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      total: parentIds.length,
      successful,
      failed,
      results,
      messageLogs: messageLogs.map(log => ({
        id: log.id,
        parentId: log.parentId,
        status: log.status,
        sentAt: log.sentAt,
        subject: log.subject,
      })),
      summary: {
        total: parentIds.length,
        successful,
        failed,
      },
      message: `Processed ${successful} messages successfully via ${channel} (integration ready for activation)`,
    });

  } catch (error) {
    return handleError(error, 'Failed to send bulk communications');
  }
}
