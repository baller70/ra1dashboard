// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  BarChart3,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Plus,
  Send,
  FileText,
  Settings,
  Database,
  Trash2
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated] = useState<Date | null>(new Date())

  // Empty state - all dashboard data has been permanently purged
  const handleManualRefresh = () => {
    console.log('Refresh clicked - but no data to refresh since all data has been purged')
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const quickActions = [
    {
      title: 'Add New Parent',
      description: 'Register a new parent in the system',
      icon: Users,
      href: '/parents',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Record Payment',
      description: 'Process a new payment or installment',
      icon: CreditCard,
      href: '/payments',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Send Communication',
      description: 'Send emails or SMS to parents',
      icon: Send,
      href: '/communication',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Manage Contracts',
      description: 'Upload and manage contracts',
      icon: FileText,
      href: '/contracts',
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your basketball program management dashboard
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                All dashboard data has been permanently removed
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {refreshing ? 'Updating...' : 'No Data'}
            </div>
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <TrendingUp className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Empty Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">—</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">—</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">—</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">—</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty Charts Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue Chart - Takes 2 columns */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Trends
                  <span className="text-sm font-normal text-muted-foreground">
                    Monthly revenue over time
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No Revenue Data</p>
                    <p className="text-sm text-gray-400">All dashboard data has been removed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Empty</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Analytics</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Disabled</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Core Functions</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
              <span className="text-sm font-normal text-muted-foreground">
                Core functionality remains available
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => router.push(action.href)}
                  className={`p-4 rounded-lg border transition-colors text-left ${action.color} border-transparent hover:shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/80`}>
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      <p className="text-xs opacity-80">{action.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Purge Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Trash2 className="h-5 w-5" />
              Dashboard Data Purged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-4">
              All dashboard and analytics data has been permanently removed from the database. 
              Core functionality (Communication, Payments, Contracts, Parents, Settings) remains fully operational.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-orange-800 mb-1">Removed:</p>
                <ul className="text-orange-600 space-y-1">
                  <li>• Dashboard statistics</li>
                  <li>• Analytics data</li>
                  <li>• Revenue calculations</li>
                  <li>• Historical metrics</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-orange-800 mb-1">Available:</p>
                <ul className="text-green-600 space-y-1">
                  <li>• Parent management</li>
                  <li>• Payment processing</li>
                  <li>• Communication tools</li>
                  <li>• Contract management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}