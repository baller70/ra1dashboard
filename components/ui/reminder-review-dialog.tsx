'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { useToast } from '../../hooks/use-toast'
import { MessageCircle, Send, Loader2, Mail, MessageSquare } from 'lucide-react'
import { Badge } from './badge'

interface PaymentData {
  parentName: string
  parentEmail: string
  amount: number
  dueDate: number
  status: string
}

interface ReminderReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentData: PaymentData
  initialMessage: string
  onSendReminder: (message: string, method: 'email' | 'sms') => Promise<void>
  isSending: boolean
}

export function ReminderReviewDialog({
  open,
  onOpenChange,
  paymentData,
  initialMessage,
  onSendReminder,
  isSending
}: ReminderReviewDialogProps) {
  const [message, setMessage] = useState<string>(initialMessage)
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const { toast } = useToast()

  // Update message when initialMessage changes
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage)
    }
  }, [initialMessage])

  const sendReminder = async () => {
    if (!message || typeof message !== 'string' || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message before sending.',
        variant: 'destructive',
      })
      return
    }

    try {
      await onSendReminder(message, method)
      
      // Close dialog after successful send
      onOpenChange(false)
      
      // Note: Success confirmation is handled by parent component
    } catch (error) {
      console.error('Error sending reminder:', error)
      
      // Show local error for immediate feedback
      toast({
        title: '❌ Failed to Send Reminder',
        description: 'Could not send payment reminder. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    }
  }

  // Ensure message is always a string
  const messageValue = typeof message === 'string' ? message : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Review Payment Reminder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Parent:</span>
              <span>{paymentData.parentName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Amount:</span>
              <span className="font-mono">${paymentData.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Due Date:</span>
              <span>{new Date(paymentData.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={paymentData.status === 'overdue' ? 'destructive' : 'secondary'}>
                {paymentData.status}
              </Badge>
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Send Method</label>
            <Select value={method} onValueChange={(value) => setMethod(value as 'email' | 'sms')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email ({paymentData.parentEmail})
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS (if available)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={messageValue}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your payment reminder message..."
              className="min-h-[200px]"
              disabled={isSending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={sendReminder}
              disabled={isSending || !messageValue.trim()}
              className="gap-2"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? 'Sending...' : `Send via ${method === 'email' ? 'Email' : 'SMS'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 