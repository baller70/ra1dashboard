export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const due = await convex.query(api.recurringReminders.getDueRecurringReminders, { limit: 50 });

    const results: any[] = [];
    for (const sched of due) {
      // Stop conditions: maxReminders
      if (sched.sentCount >= sched.maxReminders) {
        await convex.mutation(api.recurringReminders.updateRecurringReminderProgress as any, {
          scheduleId: sched._id,
          sent: false,
          isActive: false,
        } as any);
        results.push({ scheduleId: sched._id, status: 'stopped_max' });
        continue;
      }

      // TODO: stopOnPayment check should query installments/payment status
      // For now, proceed.

      // Generate fresh Stripe link (optional, could be reused)
      let stripeLink = sched.stripeLink;
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/combined-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: sched.parentId,
            paymentId: sched.paymentId,
            installmentIds: sched.installmentIds,
            totalCents: Math.round((sched.combinedTotal || 0) * 100),
            description: `Recurring combined reminder`,
          }),
        });
        const json = await resp.json().catch(() => ({} as any));
        if (resp.ok && json?.url) {
          stripeLink = json.url;
        }
      } catch {}

      // Send reminder email
      let sendOk = true;
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: sched.parentId,
            subject: `Payment Reminder - ${sched.installmentIds?.length || 0} Outstanding Payments`,
            body: `You have outstanding payments totaling $${(sched.combinedTotal || 0).toFixed(2)}.${stripeLink ? `\nPay now: ${stripeLink}` : ''}`,
            channel: 'email',
            type: 'payment_reminder',
            metadata: { scheduleId: sched._id, stripeLink },
          }),
        });
      } catch (e) {
        sendOk = false;
      }

      await convex.mutation(api.recurringReminders.logRecurringReminder as any, {
        scheduleId: sched._id,
        parentId: sched.parentId,
        installmentIds: sched.installmentIds,
        amount: sched.combinedTotal || 0,
        status: sendOk ? 'sent' : 'failed',
        error: sendOk ? undefined : 'send_failed',
        stripeLink,
      } as any);

      await convex.mutation(api.recurringReminders.updateRecurringReminderProgress as any, {
        scheduleId: sched._id,
        sent: true,
        isActive: sendOk ? true : false,
      } as any);

      results.push({ scheduleId: sched._id, status: sendOk ? 'sent' : 'failed' });
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error('Error running recurring reminders:', error);
    return NextResponse.json({ error: error?.message || 'Failed to run recurring reminders' }, { status: 500 });
  }
}

