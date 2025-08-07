'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
  totalParents: number
  totalPotentialRevenue: number
  overduePayments: number
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

  // Calculate revenue trend (simple mock for now)
  const revenueTrend = stats?.totalParents > 0 ? '+12.5%' : '0%'
  const trendColor = stats?.totalParents > 0 ? 'text-green-600' : 'text-gray-500'

  // The 6 cards you requested
  const dashboardCards = [
    // 1. Total Potential Revenue (Large Card)
    {
      title: 'Total Potential Revenue',
      value: formatCurrency(stats?.totalPotentialRevenue ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `${stats?.totalParents ?? 0} parents × $1,650`,
      trend: revenueTrend,
      trendColor: trendColor,
      size: 'large'
    },
    // 2. Overdue Payments
    {
      title: 'Overdue Payments',
      value: stats?.overduePayments?.toString() ?? '0',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Payments past due',
      size: 'medium'
    },
    // 3. Total Parents
    {
      title: 'Total Parents',
      value: stats?.totalParents?.toString() ?? '0',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Registered parents',
      size: 'medium'
    },
    // 4. Revenue Trends (Simple trend indicator)
    {
      title: 'Revenue Trends',
      value: revenueTrend,
      icon: TrendingUp,
      color: trendColor.replace('text-', 'text-'),
      bgColor: stats?.totalParents > 0 ? 'bg-green-50' : 'bg-gray-50',
      description: 'Monthly growth rate',
      size: 'medium'
    },
    // Cards 5 & 6 removed per user request
  ]

  const largeCards = dashboardCards.filter(card => card.size === 'large')
  const mediumCards = dashboardCards.filter(card => card.size === 'medium')

  return (
    <div className="space-y-6">
      {/* Large Cards Row */}
      <div className="grid gap-6 md:grid-cols-1">
        {largeCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={`large-${index}`} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {card.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-4xl font-bold">
                    {card.value}
                  </div>
                  {card.trend && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className={`h-4 w-4 ${card.trendColor}`} />
                      <span className={`text-sm font-medium ${card.trendColor}`}>
                        {card.trend}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Medium Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                <p className="text-xs text-muted-foreground mb-2">
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