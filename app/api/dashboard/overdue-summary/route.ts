export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'
import { convexHttp } from '../../../../lib/db'
import { api } from '../../../../convex/_generated/api'

export async function GET(request: Request) {
  try {
    await requireAuthWithApiKeyBypass(request)
    
    // Get overdue payments from Convex
    const overduePayments = await convexHttp.query(api.payments.getOverduePayments, {});
    
    // Group by parent to show count per parent
    const parentOverdueMap = overduePayments.reduce((acc: any, payment: any) => {
      const parentId = payment.parentId
      if (!acc[parentId]) {
        acc[parentId] = {
          parentId,
          parentName: payment.parentName,
          parentEmail: payment.parentEmail,
          overdueCount: 0,
          totalOverdueAmount: 0,
          oldestDueDate: payment.dueDate,
          daysPastDue: payment.daysPastDue || 0
        }
      }
      
      acc[parentId].overdueCount += 1
      acc[parentId].totalOverdueAmount += payment.amount || 0
      
      // Track the oldest due date
      if (payment.dueDate && payment.dueDate < acc[parentId].oldestDueDate) {
        acc[parentId].oldestDueDate = payment.dueDate
        acc[parentId].daysPastDue = payment.daysPastDue || 0
      }
      
      return acc
    }, {})
    
    // Convert to array and sort by days past due (most overdue first)
    const overdueSummary = Object.values(parentOverdueMap)
      .sort((a: any, b: any) => b.daysPastDue - a.daysPastDue)
    
    return NextResponse.json({
      success: true,
      data: {
        totalOverduePayments: overduePayments.length,
        totalOverdueParents: overdueSummary.length,
        overdueSummary
      }
    })
  } catch (error) {
    console.error('Overdue summary fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overdue summary' },
      { status: 500 }
    )
  }
}