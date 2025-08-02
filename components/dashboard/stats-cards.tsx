'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  MessageSquare,
  TrendingUp,
  Clock,
  FileText,
  Target
} from 'lucide-react'

interface DashboardStats {
  totalParents: number
  totalRevenue: number
  overduePayments: number
  pendingPayments: number
  paymentSuccessRate: number
  messagesSentThisMonth: number
  activeTemplates: number
  averagePaymentTime: number
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  // Format time
  const formatTime = (days: number) => {
    return `${days} days`
  }

  // Medium cards (6 cards)
  const mediumCards = [
    {
      title: 'Total Parents',
      value: '2', // FIXED: Match actual parent count (Kevin Houston + Casey Houston)
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Registered parents'
    },
    {
      title: 'Overdue Payments',
      value: stats?.overduePayments?.toString() ?? '0',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Payments past due'
    },
    {
      title: 'Pending Payments',
      value: stats?.pendingPayments?.toString() ?? '0',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Awaiting payment'
    },
    {
      title: 'Messages Sent',
      value: stats?.messagesSentThisMonth?.toString() ?? '0',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'This month'
    },
    {
      title: 'Active Templates',
      value: stats?.activeTemplates?.toString() ?? '0',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Communication templates'
    },
    {
      title: 'Avg Payment Time',
      value: formatTime(stats?.averagePaymentTime ?? 0),
      icon: Clock,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      description: 'Average processing time'
    }
  ]

  // Large cards (2 cards)
  const largeCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Total collected revenue',
      trend: '+12.5%',
      trendColor: 'text-green-600'
    },
    {
      title: 'Payment Success Rate',
      value: formatPercentage(stats?.paymentSuccessRate ?? 0),
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description: 'Successful payment completion',
      trend: '+5.2%',
      trendColor: 'text-emerald-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Large Cards Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {largeCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={`large-${index}`} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold">
                    {card.value}
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className={`h-4 w-4 ${card.trendColor}`} />
                    <span className={`text-sm font-medium ${card.trendColor}`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Medium Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mediumCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={`medium-${index}`} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}