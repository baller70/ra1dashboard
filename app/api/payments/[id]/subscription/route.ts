import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { paymentPlan, installments, paymentMethod, cardLast4, customerEmail, customerName, customAmount, customFrequency } = await request.json()
    const paymentId = params.id

    // Get payment details
    const payment = await convex.query(api.payments.getPayment, { id: paymentId as any })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Mark the current payment as the parent payment
    await convex.mutation(api.payments.updatePayment, {
      id: paymentId as any,
      status: 'active',
      notes: `Subscription created: ${paymentPlan} plan`
    })

    // Calculate installment details based on plan
    let installmentAmount: number
    let totalInstallments: number
    let frequency: number // months between payments

    switch (paymentPlan) {
      case 'monthly':
        installmentAmount = Math.round((payment.amount || 0) / 9)
        totalInstallments = 9
        frequency = 1
        break
      case 'quarterly':
        installmentAmount = Math.round((payment.amount || 0) / 3)
        totalInstallments = 3
        frequency = 3
        break
      case 'custom':
        installmentAmount = Math.round(parseFloat(customAmount || '0') * 100) // Convert to cents
        totalInstallments = installments || 1
        frequency = customFrequency || 1
        break
      default:
        return NextResponse.json({ error: 'Invalid payment plan' }, { status: 400 })
    }

    // Create payment installments
    const installmentIds = await convex.mutation(api.paymentInstallments.createInstallments, {
      parentPaymentId: paymentId as any,
      parentId: payment.parentId,
      paymentPlanId: payment.paymentPlanId,
      totalAmount: payment.amount || 0,
      installmentAmount,
      totalInstallments,
      frequency,
      startDate: Date.now(),
    })

    // Mark the first installment as paid since the user just completed the payment
    if (installmentIds && installmentIds.length > 0) {
      await convex.mutation(api.paymentInstallments.markInstallmentPaid, {
        installmentId: installmentIds[0],
        paidAmount: installmentAmount,
      })
    }

    // Log the subscription creation
    await convex.mutation(api.payments.createPaymentRecord, {
      parentId: payment.parentId,
      amount: 0, // This is a log entry, amount is tracked in installments
      dueDate: Date.now(),
      status: 'subscription_created',
      paymentPlanId: payment.paymentPlanId,
      subscriptionId: `sub_${Date.now()}`,
      installmentNumber: 0,
      totalInstallments: totalInstallments
    })

    return NextResponse.json({
      success: true,
      message: 'Payment plan created successfully',
      data: {
        paymentId,
        paymentPlan,
        installmentAmount: installmentAmount / 100, // Convert back to dollars for display
        totalInstallments,
        frequency,
        installmentIds,
        nextDueDate: Date.now() + (frequency * 30 * 24 * 60 * 60 * 1000), // Approximate next due date
      }
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment plan' },
      { status: 500 }
    )
  }
} 