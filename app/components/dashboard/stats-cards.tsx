
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { DollarSign, Users, AlertTriangle, Calendar, CreditCard, MessageSquare, FileText, TrendingUp, Clock } from 'lucide-react'
import { DashboardStats } from '../../lib/types'

interface OverdueParent {
  parentId: string
  parentName: string
  parentEmail: string
  overdueCount: number
  totalOverdueAmount: number
  daysPastDue: number
}

interface StatsCardsProps {
  stats: DashboardStats
  overdueParents?: OverdueParent[]
}

export function StatsCards({ stats, overdueParents = [] }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Parents',
      value: stats?.totalParents?.toString() ?? '0',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Revenue',
      value: `$${stats?.totalRevenue?.toLocaleString() ?? '0'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Overdue Payments',
      value: stats?.overduePayments?.toString() ?? '0',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Upcoming Dues',
      value: stats?.upcomingDues?.toString() ?? '0',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Active Plans',
      value: stats?.activePaymentPlans?.toString() ?? '0',
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Messages Sent',
      value: stats?.messagesSentThisMonth?.toString() ?? '0',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Active Templates',
      value: stats?.activeTemplates?.toString() ?? '0',
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      title: 'Payment Success Rate',
      value: `${stats?.paymentSuccessRate ?? 0}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Pending Payments',
      value: `$${stats?.pendingPayments?.toLocaleString() ?? '0'}`,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      title: 'Average Payment Time',
      value: `${stats?.averagePaymentTime ?? 0} days`,
      icon: Calendar,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.title === 'Overdue Payments' ? overdueParents.length : card.value}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
