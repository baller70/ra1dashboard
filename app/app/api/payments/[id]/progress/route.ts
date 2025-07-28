import { NextResponse } from 'next/server'
import { convexHttp } from '../../../../../lib/convex'
import { api } from '../../../../../convex/_generated/api'
import { requireAuth } from '../../../../../lib/api-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    // First check for temporary installments from recent payment processing
    let installments = (global as any).tempInstallments?.[params.id] || []
    
    // If no temporary installments, try to get from Convex
    if (installments.length === 0) {
      try {
        const convexInstallments = await convexHttp.query(api.paymentInstallments.getPaymentInstallments, {
          parentPaymentId: params.id as any
        });
        installments = convexInstallments || []
      } catch (error) {
        console.log('Convex query failed, using mock data:', error)
        installments = []
      }
    }

    if (!installments || installments.length === 0) {
      // Return empty progress data if no installments found
      return NextResponse.json({
        totalInstallments: 0,
        paidInstallments: 0,
        overdueInstallments: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        progressPercentage: 0,
        nextDue: null,
        installments: []
      })
    }

    // Calculate progress statistics
    const totalInstallments = installments.length
    const paidInstallments = installments.filter((i: any) => i.status === 'paid').length
    const overdueInstallments = installments.filter((i: any) => i.status === 'overdue').length
    
    const totalAmount = installments.reduce((sum: number, i: any) => sum + i.amount, 0)
    const paidAmount = installments
      .filter((i: any) => i.status === 'paid')
      .reduce((sum: number, i: any) => sum + i.amount, 0)
    const remainingAmount = totalAmount - paidAmount
    
    const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

    // Find next due payment
    const pendingInstallments = installments
      .filter((i: any) => i.status === 'pending')
      .sort((a: any, b: any) => a.dueDate - b.dueDate)
    
    const nextDue = pendingInstallments.length > 0 ? {
      id: pendingInstallments[0]._id,
      amount: pendingInstallments[0].amount,
      dueDate: pendingInstallments[0].dueDate,
      installmentNumber: pendingInstallments[0].installmentNumber
    } : null

    return NextResponse.json({
      totalInstallments,
      paidInstallments,
      overdueInstallments,
      totalAmount,
      paidAmount,
      remainingAmount,
      progressPercentage: Math.round(progressPercentage),
      nextDue,
      installments: installments.sort((a: any, b: any) => a.installmentNumber - b.installmentNumber)
    })
  } catch (error) {
    console.error('Payment progress fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment progress' },
      { status: 500 }
    )
  }
} 