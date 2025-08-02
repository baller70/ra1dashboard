
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    console.log('🔧 Development mode: Fetching recent activity for dashboard')
    
    // Get recent payments (paid and pending)
    const payments = await convex.query(api.payments.getPayments, { limit: 100 })
    const recentPayments = payments.payments?.filter((p: any) => p.status === 'paid' || p.status === 'pending') || []
    
    // Get recent parents
    const parentsData = await convex.query(api.parents.getParents, { limit: 100 })
    const parents = parentsData.parents || []
    
    const activities: any[] = []
    
    // Add recent payments (avoid duplicates by grouping by parent)
    const paymentsByParent = recentPayments
      .filter((p: any) => p.createdAt || p.paidAt)
      .reduce((acc: any, payment: any) => {
        if (!acc[payment.parentId] || payment.createdAt > acc[payment.parentId].createdAt) {
          acc[payment.parentId] = payment; // Keep the latest payment per parent
        }
        return acc;
      }, {});
    
    Object.values(paymentsByParent)
      .sort((a: any, b: any) => (b.paidAt || b.createdAt) - (a.paidAt || a.createdAt))
      .slice(0, 5) // Reduce to make room for other activities
      .forEach((payment: any) => {
        const parent = parents.find((p: any) => p._id === payment.parentId)
        const isPaid = payment.status === 'paid'
        activities.push({
          id: `payment-${payment._id}`,
          type: 'payment',
          title: isPaid ? 'Payment Received' : 'Payment Created',
          message: `${isPaid ? 'Payment' : 'Payment plan'} of $${payment.amount || 0} ${isPaid ? 'received' : 'created'}`,
          priority: isPaid ? 'medium' : 'low',
          timestamp: payment.paidAt || payment.createdAt || Date.now(),
          isRead: false,
          parentName: parent?.name || 'Unknown Parent',
          amount: payment.amount,
          icon: isPaid ? 'DollarSign' : 'CreditCard',
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
    
    // Add recent contract uploads (if any)
    try {
      const contractsData = await convex.query(api.contracts.getContracts, { limit: 20 })
      const contracts = contractsData.contracts || []
      contracts.slice(0, 3).forEach((contract: any) => {
        const parent = parents.find((p: any) => p._id === contract.parentId)
        activities.push({
          id: `contract-${contract._id}`,
          type: 'contract',
          title: 'Contract Uploaded',
          message: `New contract "${contract.title || contract.fileName || 'Document'}" uploaded`,
          priority: 'medium',
          timestamp: contract.createdAt || Date.now(),
          isRead: false,
          parentName: parent?.name || 'Unknown Parent',
          icon: 'FileText',
          actionUrl: `/contracts/${contract._id}`,
          actionText: 'View Contract'
        })
      })
    } catch (error) {
      // Contracts might not be available, skip silently
    }
    
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
