'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Calendar, DollarSign, Save, X } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

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

interface ModifyScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installments: PaymentInstallment[]
  onSave: () => Promise<void>
  paymentId: string
}

export function ModifyScheduleDialog({ 
  open, 
  onOpenChange, 
  installments, 
  onSave,
  paymentId 
}: ModifyScheduleDialogProps) {
  const [modifiedInstallments, setModifiedInstallments] = useState<Array<{
    installmentId?: string
    amount: number
    dueDate: number
    installmentNumber: number
    status?: string
  }>>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && installments.length > 0) {
      setModifiedInstallments(installments.map(installment => ({
        installmentId: installment._id,
        amount: installment.amount,
        dueDate: installment.dueDate,
        installmentNumber: installment.installmentNumber,
        status: installment.status
      })))
    }
  }, [open, installments])

  const handleAmountChange = (index: number, value: string) => {
    const newAmount = parseFloat(value) || 0
    setModifiedInstallments(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, amount: newAmount } : item
      )
    )
  }

  const handleDateChange = (index: number, value: string) => {
    const newDate = new Date(value).getTime()
    setModifiedInstallments(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, dueDate: newDate } : item
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Only allow modification of pending installments
      const modifiableInstallments = modifiedInstallments.filter(
        (item, index) => installments[index]?.status === 'pending'
      )

      if (modifiableInstallments.length === 0) {
        toast({
          title: 'No Changes Allowed',
          description: 'Only pending installments can be modified.',
          variant: 'destructive',
        })
        return
      }

      // Make the API call directly in the dialog component to avoid Fast Refresh interruption
      console.log('Making API call to save schedule for payment:', paymentId)
      const response = await fetch(`/api/payments/${paymentId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: modifiableInstallments }),
      })
      console.log('API response status:', response.status)
      const result = await response.json()
      console.log('API result:', result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save schedule changes')
      }

      // Call the onSave callback to refresh the parent's data
      await onSave()

      toast({
        title: 'Schedule Updated',
        description: 'Payment schedule has been successfully modified.',
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast({
        title: 'Error',
        description: 'Failed to update payment schedule. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDateForInput = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0]
  }

  const getTotalAmount = () => {
    return modifiedInstallments.reduce((sum, item) => sum + item.amount, 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Modify Payment Schedule
          </DialogTitle>
          <DialogDescription>
            Adjust payment amounts and due dates for pending installments. 
            Paid installments cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Schedule Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Installments</p>
                  <p className="font-semibold">{modifiedInstallments.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="font-semibold">${getTotalAmount().toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Modifiable</p>
                  <p className="font-semibold">
                    {modifiedInstallments.filter((_, i) => installments[i]?.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installments List */}
          <div className="space-y-3">
            {modifiedInstallments.map((installment, index) => {
              const originalInstallment = installments[index]
              const isPaid = originalInstallment?.status === 'paid'
              const isOverdue = originalInstallment?.status === 'overdue'
              const isModifiable = originalInstallment?.status === 'pending'

              return (
                <Card key={index} className={`${
                  isPaid ? 'bg-green-50 border-green-200' : 
                  isOverdue ? 'bg-red-50 border-red-200' : 
                  'bg-white'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Payment #{installment.installmentNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isPaid ? 'bg-green-100 text-green-800' :
                          isOverdue ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {originalInstallment?.status?.toUpperCase()}
                        </span>
                      </div>
                      {isPaid && originalInstallment?.paidAt && (
                        <span className="text-sm text-gray-600">
                          Paid: {new Date(originalInstallment.paidAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`amount-${index}`} className="text-sm">
                          Amount
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id={`amount-${index}`}
                            type="number"
                            step="0.01"
                            value={installment.amount}
                            onChange={(e) => handleAmountChange(index, e.target.value)}
                            disabled={!isModifiable}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`date-${index}`} className="text-sm">
                          Due Date
                        </Label>
                        <Input
                          id={`date-${index}`}
                          type="date"
                          value={formatDateForInput(installment.dueDate)}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          disabled={!isModifiable}
                        />
                      </div>
                    </div>

                    {!isModifiable && (
                      <p className="text-xs text-gray-500 mt-2">
                        This installment cannot be modified due to its current status.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 