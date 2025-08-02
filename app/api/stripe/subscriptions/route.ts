export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { convexHttp } from '../../../../lib/db';
import { api } from '../../../../convex/_generated/api';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

// Create subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentId, priceId, action } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 });
    }

    // Get parent from Convex
    const parent = await convexHttp.query(api.parents.getParent, {
      id: parentId as any
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const stripe = getStripe();

    if (action === 'create') {
      // Create or get Stripe customer
      let stripeCustomerId = parent.stripeCustomerId;
      
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: parent.email,
          name: parent.name,
          phone: parent.phone || undefined,
          metadata: {
            parentId: parent._id
          }
        });

        // Update parent with Stripe customer ID in Convex
        await convexHttp.mutation(api.parents.updateParent, {
          id: parent._id,
          stripeCustomerId: stripeCustomer.id
        });

        stripeCustomerId = stripeCustomer.id;
      }

      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId || process.env.STRIPE_DEFAULT_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/${parentId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/${parentId}`,
        metadata: {
          parentId: parent._id,
        },
      });

      return NextResponse.json({ 
        url: session.url,
        sessionId: session.id 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// Cancel/Update subscription
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, action } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const stripe = getStripe();

    if (action === 'cancel') {
      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // TODO: Update subscription status in Convex when subscription table is implemented
      console.log('Subscription cancelled:', subscription.id);

      return NextResponse.json({ 
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      });
    }

    if (action === 'reactivate') {
      // Reactivate subscription
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // TODO: Update subscription status in Convex when subscription table is implemented
      console.log('Subscription reactivated:', subscription.id);

      return NextResponse.json({ 
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
} 