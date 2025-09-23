export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import Stripe from 'stripe';

import { ensureCustomerByEmailAndFingerprint } from '@/lib/stripe'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 });
    }

    // Get parent information from Convex
    const parent = await convex.query(api.parents.getParent, {
      id: parentId as any
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = parent.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: parent.name,
        email: parent.email,
        phone: parent.phone || undefined,
        metadata: {
          parentId: parent._id,
          source: 'ra1-app'
        }
      });
      customerId = customer.id;

      // Update parent with Stripe customer ID in Convex
      await convex.mutation(api.parents.updateParent, {
        id: parent._id,
        stripeCustomerId: customerId
      });
    }

    // Create a setup session for adding payment methods
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/${parentId}?setup=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/${parentId}?setup=cancelled`,
      payment_method_types: ['card'],
      metadata: {
        parentId: parent._id,
        action: 'payment_setup'
      }
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      customerId: customerId,
      message: 'Setup session created successfully'
    });

  } catch (error) {
    console.error('Error creating Stripe setup session:', error);
    return NextResponse.json(
      { error: 'Failed to create setup session' },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const { parentId, paymentMethodId } = await request.json();
    if (!parentId || !paymentMethodId) {
      return NextResponse.json({ error: 'parentId and paymentMethodId are required' }, { status: 400 });
    }

    const parent = await convex.query(api.parents.getParent, { id: parentId as any });
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    // Resolve customer via two-factor matching and attach PM, set as default
    const { customerId, paymentMethodId: pmId } = await ensureCustomerByEmailAndFingerprint(
      String(paymentMethodId),
      String(parent.email),
      String(parent.name),
      parent.phone || undefined,
      { parentId: String(parent._id), source: 'setup' }
    );

    await convex.mutation(api.parents.updateParent, {
      id: parent._id,
      stripeCustomerId: customerId,
      stripePaymentMethodId: pmId,
    });

    return NextResponse.json({ success: true, customerId, paymentMethodId: pmId });
  } catch (error: any) {
    console.error('Error resolving customer via setup POST:', error);
    return NextResponse.json({ error: error?.message || 'Failed to resolve customer' }, { status: 500 });
  }
}

