export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      parentId,
      installmentIds,
      combinedTotal,
      frequencyValue,
      frequencyUnit,
      stopOnPayment,
      stopOnReply,
      maxReminders,
      stripeSessionId,
      stripeLink,
      paymentId,
    } = body || {};

    if (!parentId || !installmentIds || !combinedTotal || !frequencyValue || !frequencyUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await convex.mutation(api.recurringReminders.createRecurringReminderSchedule, {
      parentId,
      installmentIds,
      combinedTotal,
      frequencyValue,
      frequencyUnit,
      stopOnPayment: !!stopOnPayment,
      stopOnReply: !!stopOnReply,
      maxReminders: maxReminders || 10,
      stripeSessionId: stripeSessionId || null,
      stripeLink: stripeLink || null,
      paymentId: paymentId || null,
    } as any);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating recurring reminder schedule:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create schedule' }, { status: 500 });
  }
}








