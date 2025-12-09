export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '../../../convex/_generated/api';
import { convexHttp } from '../../lib/convex-server';

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
    const program = searchParams.get('program') || undefined;

    // Get payments without relying on backend program filtering; apply matching here
    const base = await (convexHttp as any).query(api.payments.getPayments, {
      page: 1,
      limit: Math.max(limit * 5, 500),
      status: status || undefined,
      parentId: (parentId as any) || undefined,
      program: undefined,
    });

    let payments = (base?.payments || []) as any[];

    // Program filtering: if program is specified, filter payments
    // For "yearly-program", include payments where no explicit program is set (default behavior)
    if (program) {
      const requested = String(program).trim();
      payments = payments.filter((p: any) => {
        const planProg = String((p?.paymentPlan as any)?.program || '').trim();
        const parentProg = String((p?.parent as any)?.program || '').trim();
        const explicit = planProg || parentProg;

        // If requesting "yearly-program", include payments with no explicit program (default)
        // as well as payments explicitly tagged as "yearly-program"
        if (requested === 'yearly-program') {
          return explicit === '' || explicit === 'yearly-program';
        }

        // For other programs, require explicit match
        return explicit === requested;
      });
    }

    // Recompute pagination
    const total = payments.length;
    const offset = (page - 1) * limit;
    const paged = payments.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        payments: paged,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
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
  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Create payment in Convex
    const payment = await (convexHttp as any).mutation(api.payments.createPayment, {
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
