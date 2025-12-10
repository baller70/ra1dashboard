export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secret, { apiVersion: '2024-06-20' } as any);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId, paymentId, installmentIds, totalCents, description } = body || {};

    if (!parentId || !paymentId || !installmentIds || !Array.isArray(installmentIds) || !totalCents) {
      return NextResponse.json({ error: 'Missing required fields: parentId, paymentId, installmentIds, totalCents' }, { status: 400 });
    }

    const parent = await convex.query(api.parents.getParent, { id: parentId as any });
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });

    const stripe = getStripe();

    let stripeCustomerId: string | undefined = parent.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: parent.name,
        email: parent.email,
        phone: parent.phone || undefined,
        metadata: { parentId: parent._id, source: 'combined_reminder' },
      });
      stripeCustomerId = customer.id;
      await convex.mutation(api.parents.updateParent, { id: parent._id, stripeCustomerId });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Number(totalCents),
            product_data: { name: 'Combined Payment', description: description || `Combined for ${installmentIds.length} installments` },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payments/${paymentId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments/${paymentId}?status=cancelled`,
      metadata: {
        parentId: String(parent._id),
        paymentId: String(paymentId),
        installmentIds: installmentIds.join(','),
        source: 'combined_reminder',
      },
    });

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating combined Stripe link:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create combined link' }, { status: 500 });
  }
}

