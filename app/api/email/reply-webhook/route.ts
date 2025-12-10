export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// This is a scaffold for SendGrid/Mailgun style inbound events.
// Expect the outbound email to include metadata token (scheduleId/parentId) in headers or body.

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scheduleId, parentId, inReplyTo, text, from } = body;

    if (!scheduleId || !parentId) {
      // Attempt to parse from headers if provided by provider
      // (Implementation would differ per provider)
    }

    if (scheduleId && parentId) {
      try {
        await convex.mutation(api.recurringReminders.updateRecurringReminderProgress as any, {
          scheduleId,
          sent: false,
          isActive: false,
        } as any);
      } catch (e) {
        console.warn('Failed to deactivate schedule on reply:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reply webhook error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook error' }, { status: 500 });
  }
}


