import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { requireAuthWithApiKeyBypass } from '../../../lib/api-utils'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface ActivityNotification {
  id: string
  type: 'payment' | 'reminder' | 'system' | 'contract' | 'parent_update'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: number
  isRead: boolean
  actionUrl?: string
  actionText?: string
  parentName?: string
  amount?: number
  icon?: string
  metadata?: any
}

export async function GET(request: NextRequest) {
  try {
    await requireAuthWithApiKeyBypass(request)
    console.log('🔧 Development mode: Fetching latest activities for notifications')
    
    // Get recent activities from different sources
    const [payments, messageLogs, contracts, parents] = await Promise.all([
      // Recent payments (last 24 hours)
      convex.query(api.payments.getPayments, { limit: 10 }),
      // Recent message logs (communication activities)
      convex.query(api.messageLogs.getRecentMessages, { limit: 10 }).catch(() => []),
      // Recent contracts
      convex.query(api.contracts.getContracts, { limit: 5 }).catch(() => []),
      // Recent parent updates
      convex.query(api.parents.getParents, { limit: 5 })
    ])

    const activities: ActivityNotification[] = []
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)

    // Process recent payments
    if (payments?.payments) {
      payments.payments.forEach((payment: any) => {
        const paymentDate = payment.updatedAt || payment.createdAt || now
        
        // Recent payments
        if (paymentDate > oneDayAgo) {
          activities.push({
            id: `payment-${payment._id}`,
            type: 'payment',
            title: payment.status === 'completed' ? 'Payment Received' : 'Payment Updated',
            message: `${payment.parentName || 'Parent'} - $${payment.amount || payment.totalAmount || 0}`,
            priority: payment.status === 'overdue' ? 'high' : 'medium',
            timestamp: paymentDate,
            isRead: false,
            actionUrl: `/payments/${payment._id}`,
            actionText: 'View Payment',
            parentName: payment.parentName,
            amount: payment.amount || payment.totalAmount,
            icon: payment.status === 'completed' ? 'check-circle' : 'clock',
            metadata: { paymentId: payment._id, status: payment.status }
          })
        }

        // Overdue payments (urgent notifications)
        if (payment.status === 'overdue' || (payment.dueDate && payment.dueDate < now && payment.status !== 'completed')) {
          activities.push({
            id: `overdue-${payment._id}`,
            type: 'payment',
            title: 'Payment Overdue',
            message: `${payment.parentName || 'Parent'} payment is overdue - $${payment.amount || payment.totalAmount || 0}`,
            priority: 'urgent',
            timestamp: payment.dueDate || paymentDate,
            isRead: false,
            actionUrl: `/payments/${payment._id}`,
            actionText: 'Collect Payment',
            parentName: payment.parentName,
            amount: payment.amount || payment.totalAmount,
            icon: 'alert-triangle',
            metadata: { paymentId: payment._id, status: 'overdue' }
          })
        }

        // Payment reminders for upcoming due dates
        if (payment.dueDate && payment.dueDate > now && payment.dueDate < (now + 3 * 24 * 60 * 60 * 1000) && payment.status !== 'completed') {
          activities.push({
            id: `reminder-${payment._id}`,
            type: 'reminder',
            title: 'Payment Due Soon',
            message: `${payment.parentName || 'Parent'} payment due in ${Math.ceil((payment.dueDate - now) / (24 * 60 * 60 * 1000))} days - $${payment.amount || payment.totalAmount || 0}`,
            priority: 'medium',
            timestamp: now,
            isRead: false,
            actionUrl: `/payments/${payment._id}`,
            actionText: 'Send Reminder',
            parentName: payment.parentName,
            amount: payment.amount || payment.totalAmount,
            icon: 'bell',
            metadata: { paymentId: payment._id, dueDate: payment.dueDate }
          })
        }
      })
    }

    // Process recent message logs (communication activities)
    if (messageLogs && Array.isArray(messageLogs)) {
      messageLogs.forEach((log: any) => {
        const logDate = log.sentAt || log.createdAt || now
        
        if (logDate > oneDayAgo) {
          activities.push({
            id: `message-${log._id}`,
            type: 'reminder',
            title: `${log.type === 'email' ? 'Email' : 'SMS'} Sent`,
            message: `${log.type === 'email' ? 'Email' : 'SMS'} sent to ${log.recipientName || log.recipientEmail || 'parent'}`,
            priority: 'low',
            timestamp: logDate,
            isRead: false,
            actionUrl: '/communication/history',
            actionText: 'View History',
            parentName: log.recipientName,
            icon: log.type === 'email' ? 'mail' : 'message-square',
            metadata: { messageId: log._id, type: log.type }
          })
        }
      })
    }

    // Process recent contracts (Convex query may return { contracts: [...], pagination: {...} })
    const contractList: any[] = Array.isArray(contracts) ? contracts : (contracts as any)?.contracts ?? [];
    if (contractList.length > 0) {
      contractList.forEach((contract: any) => {
        const contractDate = contract.updatedAt || contract.createdAt || now
        
        // New/updated contracts
        if (contractDate > oneWeekAgo) {
          activities.push({
            id: `contract-${contract._id}`,
            type: 'contract',
            title: 'Contract Updated',
            message: `Contract for ${contract.parentName || 'parent'} - ${contract.status || 'updated'}`,
            priority: 'medium',
            timestamp: contractDate,
            isRead: false,
            actionUrl: `/contracts/${contract._id}`,
            actionText: 'View Contract',
            parentName: contract.parentName,
            icon: 'file-text',
            metadata: { contractId: contract._id, status: contract.status }
          })
        }

        // Expiring contracts
        if (contract.expiresAt && contract.expiresAt < (now + 30 * 24 * 60 * 60 * 1000) && contract.expiresAt > now) {
          const daysUntilExpiry = Math.ceil((contract.expiresAt - now) / (24 * 60 * 60 * 1000))
          activities.push({
            id: `expiring-${contract._id}`,
            type: 'contract',
            title: 'Contract Expiring Soon',
            message: `Contract for ${contract.parentName || 'parent'} expires in ${daysUntilExpiry} days`,
            priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
            timestamp: now,
            isRead: false,
            actionUrl: `/contracts/${contract._id}`,
            actionText: 'Renew Contract',
            parentName: contract.parentName,
            icon: 'alert-circle',
            metadata: { contractId: contract._id, expiresAt: contract.expiresAt }
          })
        }
      })
    }

    // Process recent parent updates
    if (parents?.parents) {
      parents.parents.forEach((parent: any) => {
        const parentDate = parent.updatedAt || parent.createdAt || now
        
        if (parentDate > oneDayAgo && parent.updatedAt && parent.updatedAt !== parent.createdAt) {
          activities.push({
            id: `parent-${parent._id}`,
            type: 'parent_update',
            title: 'Parent Profile Updated',
            message: `${parent.name} profile was updated`,
            priority: 'low',
            timestamp: parentDate,
            isRead: false,
            actionUrl: `/parents/${parent._id}`,
            actionText: 'View Profile',
            parentName: parent.name,
            icon: 'user',
            metadata: { parentId: parent._id }
          })
        }
      })
    }

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp)

    // Limit to most recent 20 activities
    const recentActivities = activities.slice(0, 20)

    // Calculate counts
    const counts = {
      total: recentActivities.length,
      unread: recentActivities.filter(a => !a.isRead).length,
      urgent: recentActivities.filter(a => a.priority === 'urgent' && !a.isRead).length,
      high: recentActivities.filter(a => a.priority === 'high' && !a.isRead).length,
      byType: {
        payment: recentActivities.filter(a => a.type === 'payment' && !a.isRead).length,
        reminder: recentActivities.filter(a => a.type === 'reminder' && !a.isRead).length,
        contract: recentActivities.filter(a => a.type === 'contract' && !a.isRead).length,
        system: recentActivities.filter(a => a.type === 'system' && !a.isRead).length,
        parent_update: recentActivities.filter(a => a.type === 'parent_update' && !a.isRead).length,
      }
    }

    console.log(`📊 Generated ${recentActivities.length} activity notifications`)
    console.log(`🔔 Unread: ${counts.unread}, Urgent: ${counts.urgent}, High: ${counts.high}`)

    return NextResponse.json({
      success: true,
      data: {
        activities: recentActivities,
        counts
      }
    })

  } catch (error) {
    console.error('❌ Notifications API error:', error)
    
    // Return mock data for development
    const mockActivities: ActivityNotification[] = [
      {
        id: 'mock-1',
        type: 'payment',
        title: 'Payment Overdue',
        message: 'Sarah Chen payment is 3 days overdue - $550',
        priority: 'urgent',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        isRead: false,
        actionUrl: '/payments',
        actionText: 'Collect Payment',
        parentName: 'Sarah Chen',
        amount: 550,
        icon: 'alert-triangle'
      },
      {
        id: 'mock-2',
        type: 'payment',
        title: 'Payment Received',
        message: 'Marcus Johnson - $183.33',
        priority: 'medium',
        timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
        isRead: false,
        actionUrl: '/payments',
        actionText: 'View Payment',
        parentName: 'Marcus Johnson',
        amount: 183.33,
        icon: 'check-circle'
      },
      {
        id: 'mock-3',
        type: 'reminder',
        title: 'Payment Due Soon',
        message: 'Jennifer Williams payment due in 2 days - $550',
        priority: 'medium',
        timestamp: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
        isRead: false,
        actionUrl: '/payments',
        actionText: 'Send Reminder',
        parentName: 'Jennifer Williams',
        amount: 550,
        icon: 'bell'
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        activities: mockActivities,
        counts: {
          total: mockActivities.length,
          unread: mockActivities.filter(a => !a.isRead).length,
          urgent: mockActivities.filter(a => a.priority === 'urgent').length,
          high: mockActivities.filter(a => a.priority === 'high').length,
          byType: {
            payment: 2,
            reminder: 1,
            contract: 0,
            system: 0,
            parent_update: 0
          }
        }
      }
    })
  }
} 