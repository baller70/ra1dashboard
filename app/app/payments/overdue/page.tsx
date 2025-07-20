'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { 
  AlertTriangle, 
  Search, 
  Calendar, 
  DollarSign,
  Clock,
  Mail,
  Phone,
  Edit,
  FileText,
  TrendingDown,
  Users,
  CreditCard,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { PaymentWithRelations } from '../../../lib/types'

type OverduePayment = {
  id: string
  parentId: string
  parentName: string
  parentEmail: string
  amount: number
  dueDate: string | Date
  daysPastDue: number
  remindersSent: number
  lastReminderSent: string | null
  paymentPlanType: string
}

export default function OverduePaymentsPage() {
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [sendingReminders, setSendingReminders] = useState(false)

  useEffect(() => {
    fetchOverduePayments()
  }, [])

  const fetchOverduePayments = async () => {
    try {
      const response = await fetch('/api/payments/overdue')
      
      if (response.ok) {
        const data = await response.json()
        setOverduePayments(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch overdue payments:', response.status)
      }
    } catch (error) {
      console.error('Error fetching overdue payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSelection = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments(prev => [...prev, paymentId])
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId))
    }
  }

  const selectAllPayments = () => {
    setSelectedPayments(filteredPayments.map(p => p.id))
  }

  const clearSelection = () => {
    setSelectedPayments([])
  }

  const sendReminders = async () => {
    if (selectedPayments.length === 0) {
      alert('Please select payments to send reminders for')
      return
    }

    setSendingReminders(true)
    try {
      const response = await fetch('/api/payments/overdue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: selectedPayments })
      })

      if (response.ok) {
        alert(`Sent ${selectedPayments.length} reminder(s) successfully`)
        clearSelection()
      } else {
        alert('Failed to send reminders')
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
      alert('Error sending reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  const getDaysOverdue = (dueDate: string | Date) => {
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
    return Math.floor((new Date().getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getOverdueSeverity = (days: number) => {
    if (days <= 7) return { color: 'bg-yellow-100 text-yellow-800', label: 'Recently Due' }
    if (days <= 30) return { color: 'bg-orange-100 text-orange-800', label: 'Overdue' }
    return { color: 'bg-red-100 text-red-800', label: 'Seriously Overdue' }
  }

  const filteredPayments = overduePayments.filter(payment =>
    payment.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.parentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalOverdueAmount = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const averageDaysOverdue = filteredPayments.length > 0 
    ? filteredPayments.reduce((sum, payment) => sum + getDaysOverdue(payment.dueDate), 0) / filteredPayments.length
    : 0

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p>Loading overdue payments...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="mr-3 h-8 w-8 text-red-600" />
              Overdue Payments
            </h1>
            <p className="text-gray-600">Manage and follow up on overdue payments</p>
          </div>
          <div className="flex space-x-2">
            {selectedPayments.length > 0 && (
              <Button 
                onClick={sendReminders}
                disabled={sendingReminders}
                className="bg-red-600 hover:bg-red-700"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Reminders ({selectedPayments.length})
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/payments">
                All Payments
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search overdue payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{filteredPayments.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Amount Overdue</p>
                  <p className="text-2xl font-bold text-red-600">${totalOverdueAmount.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Days Late</p>
                  <p className="text-2xl font-bold text-orange-600">{averageDaysOverdue.toFixed(0)}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Selected</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedPayments.length}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        {filteredPayments.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedPayments.length === filteredPayments.length}
                    onCheckedChange={(checked) => checked ? selectAllPayments() : clearSelection()}
                  />
                  <span className="text-sm font-medium">
                    {selectedPayments.length} of {filteredPayments.length} payments selected
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectAllPayments}>
                    Select All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments ({filteredPayments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No overdue payments found</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search terms.' : 'All payments are up to date!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => {
                  const daysOverdue = payment.daysPastDue || getDaysOverdue(payment.dueDate)
                  const severity = getOverdueSeverity(daysOverdue)
                  
                  return (
                    <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedPayments.includes(payment.id)}
                          onCheckedChange={(checked) => handlePaymentSelection(payment.id, !!checked)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900">{payment.parentName || 'Unknown Parent'}</h3>
                              <Badge className={severity.color}>
                                {daysOverdue} days {severity.label.toLowerCase()}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">
                                ${Number(payment.amount).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                Due: {new Date(payment.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span> {payment.parentEmail || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Reminders Sent:</span> {payment.remindersSent}
                            </div>
                            <div>
                              <span className="font-medium">Payment Plan:</span> {payment.paymentPlanType || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {payment.parentId && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/parents/${payment.parentId}`}>
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/payments/${payment.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
} 