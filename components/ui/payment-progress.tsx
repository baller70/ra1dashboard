'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Button } from './button'
import { Progress } from './progress'
import { Calendar, Clock, DollarSign, CheckCircle, AlertTriangle, CreditCard, Bot } from 'lucide-react'
import { format } from 'date-fns'

interface PaymentInstallment {
  _id: string
  installmentNumber: number
  amount: number
  dueDate: number
  status: 'pending' | 'paid' | 'overdue' | 'failed'
  paidAt?: number
  isInGracePeriod?: boolean
  gracePeriodEnd?: number
  remindersSent: number
}

interface PaymentProgressData {
  totalInstallments: number
  paidInstallments: number
  overdueInstallments: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  progressPercentage: number
  nextDue: {
    id: string
    amount: number
    dueDate: number
    installmentNumber: number
  } | null
  installments: PaymentInstallment[]
}

interface PaymentProgressProps {
  progressData?: PaymentProgressData
  onPayInstallment?: (installmentId: string) => void
  onModifySchedule?: () => void
  onAiReminder?: (installment: PaymentInstallment) => void
  isAdmin?: boolean
}

export function PaymentProgress({ 
  progressData, 
  onPayInstallment, 
  onModifySchedule,
  onAiReminder,
  isAdmin = false 
}: PaymentProgressProps) {
  // If no progressData is provided, return null or a placeholder
  if (!progressData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Progress
          </CardTitle>
          <CardDescription>
            Payment progress information is not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            No payment progress data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500'
      case 'overdue': return 'bg-red-500'
      case 'pending': return 'bg-blue-500'
      case 'failed': return 'bg-gray-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default'
      case 'overdue': return 'destructive'
      case 'pending': return 'secondary'
      case 'failed': return 'outline'
      default: return 'outline'
    }
  }

  const getInstallmentCardStyle = (status: string) => {
    switch (status) {
      case 'paid': 
        return 'bg-green-50 border-green-200 hover:bg-green-100 transition-colors'
      case 'overdue': 
        return 'bg-red-50 border-red-200 hover:bg-red-100 transition-colors'
      case 'pending': 
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors'
      case 'failed': 
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors'
      default: 
        return 'bg-white border-gray-200 hover:bg-gray-50 transition-colors'
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Progress
          </CardTitle>
          <CardDescription>
            {progressData.paidInstallments} of {progressData.totalInstallments} payments completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progressData.progressPercentage)}%</span>
            </div>
            <Progress value={progressData.progressPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${(progressData.paidAmount / 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Paid</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                ${(progressData.remainingAmount / 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                ${(progressData.totalAmount / 100).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Payment Due */}
      {progressData.nextDue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Payment Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  Payment #{progressData.nextDue.installmentNumber}
                </div>
                <div className="text-sm text-muted-foreground">
                  Due: {format(new Date(progressData.nextDue.dueDate), 'MMM dd, yyyy')}
                </div>
                <div className="text-xl font-bold text-blue-600">
                  ${(progressData.nextDue.amount / 100).toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => onPayInstallment?.(progressData.nextDue!.id)}
                  className="w-full"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onModifySchedule}
                    className="w-full"
                  >
                    Modify Schedule
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Schedule */}
      {progressData.installments && progressData.installments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
            <CardDescription>
              Complete payment history and upcoming installments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressData.installments.map((installment) => (
                <div 
                  key={installment._id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${getInstallmentCardStyle(installment.status)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(installment.status)} flex items-center justify-center`}>
                      {installment.status === 'paid' && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${installment.status === 'paid' ? 'text-green-800' : ''}`}>
                        Payment #{installment.installmentNumber}
                        {installment.status === 'paid' && (
                          <span className="ml-2 text-green-600 font-semibold">✓ PAID</span>
                        )}
                      </div>
                      <div className={`text-sm ${installment.status === 'paid' ? 'text-green-700' : 'text-muted-foreground'}`}>
                        Due: {format(new Date(installment.dueDate), 'MMM dd, yyyy')}
                        {installment.paidAt && (
                          <span className="ml-2 text-green-600 font-medium">
                            • Paid: {format(new Date(installment.paidAt), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                      {installment.isInGracePeriod && installment.gracePeriodEnd && (
                        <div className="text-xs text-orange-600">
                          Grace period ends: {format(new Date(installment.gracePeriodEnd), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-semibold ${installment.status === 'paid' ? 'text-green-800' : ''}`}>
                        ${(installment.amount / 100).toFixed(2)}
                      </div>
                      {installment.remindersSent > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {installment.remindersSent} reminder{installment.remindersSent > 1 ? 's' : ''} sent
                        </div>
                      )}
                    </div>
                    
                    <Badge variant={getStatusBadgeVariant(installment.status)}>
                      {installment.status === 'paid' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {installment.status === 'overdue' && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                    </Badge>

                    <div className="flex gap-2">
                      {installment.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onPayInstallment?.(installment._id)}
                        >
                          Pay
                        </Button>
                      )}
                      {(installment.status === 'pending' || installment.status === 'overdue') && onAiReminder && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onAiReminder(installment)}
                          className="flex items-center gap-1"
                        >
                          <Bot className="h-3 w-3" />
                          AI Reminder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {progressData.overdueInstallments > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              You have {progressData.overdueInstallments} overdue payment{progressData.overdueInstallments > 1 ? 's' : ''}. 
              Please make payment as soon as possible to avoid additional fees.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 