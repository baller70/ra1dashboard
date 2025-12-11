export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔧 Fetching payment progress for ID:', params.id)

    // Get the payment with its plan and installments
    let payment = await prisma.payments.findUnique({
      where: { id: params.id },
      include: {
        payment_plans: {
          include: {
            payment_installments: {
              orderBy: { installmentNumber: 'asc' }
            }
          }
        }
      }
    })

    // If not found by Prisma ID, try a broader search
    if (!payment) {
      payment = await prisma.payments.findFirst({
        where: {
          OR: [
            { id: params.id },
            { id: { contains: params.id } }
          ]
        },
        include: {
          payment_plans: {
            include: {
              payment_installments: {
                orderBy: { installmentNumber: 'asc' }
              }
            }
          }
        }
      })
    }

    if (!payment) {
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

    // Get installments from the payment plan or create a single installment from the payment
    let installments: any[] = []

    if (payment.payment_plans?.payment_installments && payment.payment_plans.payment_installments.length > 0) {
      installments = payment.payment_plans.payment_installments.map((inst: any) => ({
        _id: inst.id,
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: inst.amount,
        dueDate: inst.dueDate?.getTime() || Date.now(),
        status: inst.status,
        paidAt: inst.paidAt?.getTime() || null,
        notes: inst.notes,
        isOverdue: inst.status === 'pending' && inst.dueDate && new Date(inst.dueDate) < new Date()
      }))
      console.log(`✅ Found ${installments.length} installments from payment plan`)
    } else {
      // Single payment - treat as one installment
      installments = [{
        _id: payment.id,
        id: payment.id,
        installmentNumber: 1,
        amount: payment.amount,
        dueDate: payment.dueDate?.getTime() || Date.now(),
        status: payment.status,
        paidAt: payment.paidAt?.getTime() || null,
        notes: payment.notes,
        isOverdue: payment.status === 'pending' && payment.dueDate && new Date(payment.dueDate) < new Date()
      }]
      console.log(`📦 Created single installment from payment`)
    }

    if (installments.length === 0) {
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
    const overdueInstallments = installments.filter((i: any) => i.isOverdue).length

    const totalAmount = installments.reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
    const paidAmount = installments
      .filter((i: any) => i.status === 'paid')
      .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
    const remainingAmount = totalAmount - paidAmount

    const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

    // Find next due payment
    const pendingInstallments = installments.filter((i: any) => i.status === 'pending')
    const nextDue = pendingInstallments.length > 0
      ? pendingInstallments.sort((a: any, b: any) => a.dueDate - b.dueDate)[0]
      : null

    console.log(`📊 Progress: ${paidInstallments}/${totalInstallments} paid, ${progressPercentage.toFixed(1)}%`)

    return NextResponse.json({
      totalInstallments,
      paidInstallments,
      overdueInstallments,
      totalAmount,
      paidAmount,
      remainingAmount,
      progressPercentage,
      nextDue,
      installments
    })

  } catch (error) {
    console.error('Error fetching payment progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment progress', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
