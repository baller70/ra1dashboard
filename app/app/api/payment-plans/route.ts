
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/api-utils'
import { convexHttp } from '../../../lib/convex'
import { api } from '../../../convex/_generated/api'

export async function GET() {
  try {
    await requireAuth()
    
    // Get payment plans from Convex
    const paymentPlans = await convexHttp.query(api.payments.getPaymentPlans, {});

    return NextResponse.json(paymentPlans)
  } catch (error) {
    console.error('Payment plans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment plans' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const {
      parentId,
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate,
      description
    } = body

    // Validate required fields
    if (!parentId || !type || !totalAmount || !installmentAmount || !installments || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create payment plan in Convex
    const paymentPlanId = await convexHttp.mutation(api.payments.createPaymentPlan, {
      parentId: parentId as any,
      type,
      totalAmount,
      installmentAmount,
      installments,
      startDate: new Date(startDate).getTime(),
      status: 'active',
      description
    });

    // Create individual payment records
    const payments = []
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      const paymentId = await convexHttp.mutation(api.payments.createPayment, {
        parentId: parentId as any,
        paymentPlanId: paymentPlanId as any,
        amount: installmentAmount,
        dueDate: dueDate.getTime(),
        status: 'pending'
      });

      payments.push(paymentId);
    }

    // Get the created payment plan with parent info
    const createdPlan = await convexHttp.query(api.payments.getPaymentPlans, {
      parentId: parentId as any
    });

    const plan = createdPlan.find(p => p._id === paymentPlanId);

    return NextResponse.json(plan || { _id: paymentPlanId })
  } catch (error) {
    console.error('Payment plan creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment plan' },
      { status: 500 }
    )
  }
}
