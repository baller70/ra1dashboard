export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET request for payment ID:', params.id)
    
    // Try to find by Prisma ID first
    let payment = await prisma.payments.findUnique({
      where: { id: params.id },
      include: {
        parents: {
          include: {
            teams: true
          }
        },
        payment_plans: true
      }
    })

    // If not found by Prisma ID, try with search
    if (!payment) {
      payment = await prisma.payments.findFirst({
        where: {
          OR: [
            { id: params.id },
            { id: { contains: params.id } }
          ]
        },
        include: {
          parents: {
            include: {
              teams: true
            }
          },
          payment_plans: true
        }
      })
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Transform to match expected format
    const result = {
      _id: payment.id,
      id: payment.id,
      amount: payment.amount,
      dueDate: payment.dueDate?.toISOString(),
      paidAt: payment.paidAt?.toISOString() || null,
      status: payment.status,
      remindersSent: payment.remindersSent || 0,
      notes: payment.notes,
      paymentMethod: payment.paymentMethod,
      parentId: payment.parentId,
      parent: payment.parents ? {
        _id: payment.parents.id,
        id: payment.parents.id,
        name: payment.parents.name,
        email: payment.parents.email,
        phone: payment.parents.phone,
        contractStatus: payment.parents.contractStatus,
        contractUrl: payment.parents.contractUrl,
        stripeCustomerId: payment.parents.stripeCustomerId,
        teamId: payment.parents.teamId,
        team: payment.parents.teams ? {
          _id: payment.parents.teams.id,
          id: payment.parents.teams.id,
          name: payment.parents.teams.name,
          color: payment.parents.teams.color,
          description: payment.parents.teams.description
        } : null
      } : null,
      paymentPlan: payment.payment_plans ? {
        _id: payment.payment_plans.id,
        id: payment.payment_plans.id,
        type: payment.payment_plans.type,
        totalAmount: payment.payment_plans.totalAmount,
        installmentAmount: payment.payment_plans.installmentAmount,
        installments: payment.payment_plans.installments,
        description: payment.payment_plans.description,
        status: payment.payment_plans.status,
        season: payment.payment_plans.season,
        year: payment.payment_plans.year
      } : null
    }

    console.log('Payment data from Prisma:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, paidAt, notes, paymentMethod } = body

    console.log('PATCH request for payment ID:', params.id, 'with body:', body)

    // Find the payment first
    let payment = await prisma.payments.findUnique({
      where: { id: params.id }
    })

    if (!payment) {
      payment = await prisma.payments.findFirst({
        where: {
          OR: [
            { id: params.id },
            { id: { contains: params.id } }
          ]
        }
      })
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Update the payment
    const updatedPayment = await prisma.payments.update({
      where: { id: payment.id },
      data: {
        ...(status && { status }),
        ...(paidAt !== undefined && { paidAt: paidAt ? new Date(paidAt) : null }),
        ...(notes !== undefined && { notes }),
        ...(paymentMethod && { paymentMethod }),
        updatedAt: new Date()
      },
      include: {
        parents: {
          include: { teams: true }
        },
        payment_plans: true
      }
    })

    console.log('Payment updated successfully:', updatedPayment)

    return NextResponse.json({
      _id: updatedPayment.id,
      id: updatedPayment.id,
      ...updatedPayment
    })
  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE request for payment ID:', params.id)

    // Find the payment first
    let payment = await prisma.payments.findUnique({
      where: { id: params.id }
    })

    if (!payment) {
      payment = await prisma.payments.findFirst({
        where: {
          OR: [
            { id: params.id },
            { id: { contains: params.id } }
          ]
        }
      })
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Delete the payment
    await prisma.payments.delete({
      where: { id: payment.id }
    })

    console.log('Payment deleted successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Payment deleted successfully'
    })
  } catch (error) {
    console.error('Payment deletion error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete payment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
