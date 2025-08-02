
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'
import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { syncType = 'all', parentId } = body

    // For now, return mock sync results since Stripe integration tables aren't fully implemented in Convex
    // TODO: Implement Stripe subscription, invoice, and payment method tables in Convex schema
    const results = {
      customers: 0,
      subscriptions: 0,
      invoices: 0,
      paymentMethods: 0,
      errors: [] as string[]
    }

    console.log('Stripe sync requested:', { syncType, parentId });

    // Basic validation - check if parent exists if parentId provided
    if (parentId) {
      try {
        const parent = await convexHttp.query(api.parents.getParent, {
          id: parentId as any
        });
        
        if (!parent) {
          results.errors.push('Parent not found');
        } else if (parent.stripeCustomerId) {
          results.customers = 1; // Mock sync of 1 customer
        }
      } catch (error) {
        results.errors.push('Failed to fetch parent data');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe sync completed (mock) - full sync functionality not yet implemented',
      results
    })

  } catch (error) {
    console.error('Stripe sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 });
    }

    // For now, return mock sync results since Stripe integration tables aren't fully implemented in Convex
    // TODO: Implement Stripe subscription, invoice, and payment method tables in Convex schema
    const results = {
      customers: 0,
      subscriptions: 0,
      invoices: 0,
      paymentMethods: 0,
      errors: [] as string[]
    }

    console.log('Stripe sync requested for parent:', parentId);

    try {
      const parent = await convexHttp.query(api.parents.getParent, {
        id: parentId as any
      });
      
      if (!parent) {
        results.errors.push('Parent not found');
      } else if (parent.stripeCustomerId) {
        results.customers = 1; // Mock sync of 1 customer
      }
    } catch (error) {
      results.errors.push('Failed to fetch parent data');
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe sync completed (mock) - full sync functionality not yet implemented',
      results
    });

  } catch (error) {
    console.error('Stripe sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    );
  }
}
