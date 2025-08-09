export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const createPaymentSchema = z.object({
  parentId: z.string(),
  paymentPlanId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const parentId = searchParams.get('parentId');

    // Get payments from Convex
    const result = await convex.query(api.payments.getPayments, {
      page,
      limit,
      status: status || undefined,
      parentId: parentId as any || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result
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
  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Create payment in Convex
    const payment = await convex.mutation(api.payments.createPayment, {
      parentId: validatedData.parentId as any,
      paymentPlanId: validatedData.paymentPlanId as any,
      amount: validatedData.amount,
      dueDate: new Date(validatedData.dueDate).getTime(),
      status: 'pending',
      paymentMethod: (body && typeof body.paymentMethod === 'string') ? body.paymentMethod : undefined,
    });

    return NextResponse.json({ success: true, data: { _id: payment } }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
