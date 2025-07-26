
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Development mode: Fetching recent activity for dashboard')
    
    // Get recent payments (paid ones)
    const payments = await convex.query(api.payments.getPayments, { limit: 100 })
    const paidPayments = payments.payments?.filter((p: any) => p.status === 'paid') || []
    
    // Get recent parents
    const parentsData = await convex.query(api.parents.getParents, { limit: 100 })
    const parents = parentsData.parents || []
    
    const activities: any[] = []
    
    // Add recent payments
    paidPayments
      .filter((p: any) => p.paidAt)
      .sort((a: any, b: any) => b.paidAt - a.paidAt)
      .slice(0, 8)
      .forEach((payment: any) => {
        const parent = parents.find((p: any) => p._id === payment.parentId)
        activities.push({
          id: `payment-${payment._id}`,
          type: 'payment',
          title: 'Payment Received',
          message: `Payment of $${payment.amount || 0} received`,
          priority: 'medium',
          timestamp: payment.paidAt,
          isRead: false,
          parentName: parent?.name || 'Unknown Parent',
          amount: payment.amount,
          icon: 'DollarSign',
          actionUrl: `/payments/${payment._id}`,
          actionText: 'View Payment'
        })
      })
    
    // Add recent parent creations
    parents
      .filter((p: any) => p.createdAt)
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .forEach((parent: any) => {
        activities.push({
          id: `parent-${parent._id}`,
          type: 'parent_update',
          title: 'New Parent Added',
          message: `New parent ${parent.name} was added to the system`,
          priority: 'low',
          timestamp: parent.createdAt,
          isRead: false,
          parentName: parent.name,
          icon: 'User',
          actionUrl: `/parents/${parent._id}`,
          actionText: 'View Profile'
        })
      })
    
    // Sort by timestamp and return most recent
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
    
    console.log(`📊 Generated ${sortedActivities.length} recent activities`)
    
    return NextResponse.json({
      success: true,
      data: {
        activities: sortedActivities,
        total: sortedActivities.length
      }
    })
  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch recent activity',
        data: { activities: [], total: 0 }
      },
      { status: 500 }
    )
  }
}
