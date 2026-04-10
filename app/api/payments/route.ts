export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET(request: NextRequest) {
  if (!convex) {
    return NextResponse.json(
      { error: 'Convex not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const parentId = searchParams.get('parentId');

    const result = await convex.query(api.payments.getPayments, {
      page,
      limit,
      status: status && status !== 'all' ? status : undefined,
      parentId: parentId || undefined
    });

    const transformedPayments = (result.payments || []).map((p: any) => ({
      _id: p._id,
      id: p._id,
      parentId: p.parentId,
      paymentPlanId: p.paymentPlanId,
      amount: p.amount,
      dueDate: p.dueDate,
      status: p.status,
      paidAt: p.paidAt,
      notes: p.notes,
      description: p.description,
      paymentMethod: p.paymentMethod,
      season: p.season,
      year: p.year,
      createdAt: p.createdAt || p._creationTime,
      updatedAt: p.updatedAt,
      parent: p.parent || null,
      paymentPlan: p.paymentPlan || null
    }));

    return NextResponse.json({
      success: true,
      data: {
        payments: transformedPayments,
        pagination: {
          page,
          limit,
          total: result.pagination?.total || transformedPayments.length,
          pages: result.pagination?.pages || Math.ceil(transformedPayments.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!convex) {
    return NextResponse.json(
      { error: 'Convex not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const paymentId = await convex.mutation(api.payments.createPayment, {
      parentId: body.parentId,
      paymentPlanId: body.paymentPlanId,
      amount: body.amount,
      dueDate: body.dueDate,
      status: 'pending',
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      description: body.description
    });

    return NextResponse.json({ success: true, data: { _id: paymentId } }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
