'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { useToast } from '../../hooks/use-toast'
import { MessageCircle, Send, Sparkles, Loader2, Mail, MessageSquare, FileText, Wand2 } from 'lucide-react'
import { Badge } from './badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

interface PaymentData {
  parentName: string
  parentEmail: string
  amount: number
  dueDate: number
  installmentNumber: number
  totalInstallments?: number
  paymentPlan?: string
  status: string
  daysPastDue?: number
}

interface Template {
  _id: string
  name: string
  subject: string
  body: string
  category: string
  channel: string
}

interface AiPaymentReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentData: PaymentData
  onSendReminder: (message: string, method: 'email' | 'sms') => Promise<void>
}

export function AiPaymentReminderDialog({
  open,
  onOpenChange,
  paymentData,
  onSendReminder
}: AiPaymentReminderDialogProps) {
  const [message, setMessage] = useState<string>('')
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const [messageSource, setMessageSource] = useState<'ai' | 'template'>('ai')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  // Auto-generate AI message when switching to AI mode or dialog opens
  useEffect(() => {
    if (open && messageSource === 'ai' && !message) {
      generateMessage()
    }
  }, [open, messageSource])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error('Failed to load templates')
      }
      const templatesData = await response.json()
      
      // Filter for payment reminder templates
      const paymentTemplates = templatesData.filter((template: Template) => 
        template.category === 'payment_reminder' || 
        template.category === 'payment' ||
        template.name?.toLowerCase().includes('payment') ||
        template.name?.toLowerCase().includes('reminder')
      )
      
      setTemplates(paymentTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: 'Failed to load templates',
        description: 'Could not load payment reminder templates.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadTemplate = async (templateId: string) => {
    const template = templates.find(t => t._id === templateId)
    if (!template) return

    try {
      // Replace template variables with payment data
      let templateMessage = template.body || ''
      
      // Replace common variables
      templateMessage = templateMessage
        .replace(/\{parentName\}/g, paymentData.parentName)
        .replace(/\{parent_name\}/g, paymentData.parentName)
        .replace(/\{amount\}/g, paymentData.amount.toString())
        .replace(/\{dueDate\}/g, new Date(paymentData.dueDate).toLocaleDateString())
        .replace(/\{due_date\}/g, new Date(paymentData.dueDate).toLocaleDateString())
        .replace(/\{installmentNumber\}/g, paymentData.installmentNumber.toString())
        .replace(/\{installment_number\}/g, paymentData.installmentNumber.toString())
        .replace(/\{status\}/g, paymentData.status)
        .replace(/\{daysPastDue\}/g, paymentData.daysPastDue?.toString() || '0')
        .replace(/\{days_past_due\}/g, paymentData.daysPastDue?.toString() || '0')

      setMessage(templateMessage)
      
      toast({
        title: 'Template Loaded',
        description: `Loaded "${template.name}" template with payment details.`,
      })
    } catch (error) {
      console.error('Error loading template:', error)
      toast({
        title: 'Template Load Failed',
        description: 'Could not load the selected template.',
        variant: 'destructive',
      })
    }
  }

  const generateMessage = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            parentName: paymentData.parentName,
            amount: paymentData.amount,
            dueDate: new Date(paymentData.dueDate).toLocaleDateString(),
            installmentNumber: paymentData.installmentNumber,
            totalInstallments: paymentData.totalInstallments,
            status: paymentData.status,
            daysPastDue: paymentData.daysPastDue,
            messageType: paymentData.status === 'overdue' ? 'overdue' : 'reminder',
            tone: 'friendly',
            urgencyLevel: paymentData.status === 'overdue' ? 4 : 3
          },
          customInstructions: `Generate a ${paymentData.status === 'overdue' ? 'urgent' : 'friendly'} payment reminder for ${paymentData.parentName} regarding installment #${paymentData.installmentNumber} of $${paymentData.amount} due on ${new Date(paymentData.dueDate).toLocaleDateString()}. ${paymentData.status === 'overdue' && paymentData.daysPastDue ? `This payment is ${paymentData.daysPastDue} days overdue.` : ''} Keep it professional but warm.`,
          includePersonalization: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate message: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate message')
      }

      // Extract the message body from the AI response
      const generatedMessage = data.message?.body || data.message || ''
      
      // Convert HTML to plain text for the textarea
      const plainTextMessage = generatedMessage
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n\s*\n/g, '\n\n') // Clean up extra newlines
        .trim()

      setMessage(typeof plainTextMessage === 'string' ? plainTextMessage : '')
      
      toast({
        title: 'AI Message Generated',
        description: 'Your personalized payment reminder has been generated successfully.',
      })
    } catch (error) {
      console.error('Error generating message:', error)
      toast({
        title: 'AI Generation Failed',
        description: 'Failed to generate AI message. Using default template instead.',
        variant: 'destructive',
      })
      // Set a default message if AI generation fails
      setMessage(`Hi ${paymentData.parentName},

I hope this message finds you well. I wanted to reach out regarding installment #${paymentData.installmentNumber} of $${paymentData.amount} that was due on ${new Date(paymentData.dueDate).toLocaleDateString()}.

${paymentData.status === 'overdue' && paymentData.daysPastDue ? 
  `This payment is currently ${paymentData.daysPastDue} day${paymentData.daysPastDue > 1 ? 's' : ''} overdue. ` : 
  'This payment is now due. '
}

Please let me know if you have any questions or if there's anything I can help you with regarding this payment.

Thank you for your attention to this matter.

Best regards,
The Basketball Factory Inc.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const sendReminder = async () => {
    if (!message || typeof message !== 'string' || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message before sending.',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    try {
      await onSendReminder(message, method)
      
      // Show immediate success feedback
      toast({
        title: '✅ Email Sent Successfully!',
        description: `Payment reminder sent via ${method.toUpperCase()} to ${paymentData.parentName}.`,
        duration: 5000,
      })
      
      // Small delay to ensure toast is visible before closing dialog
      setTimeout(() => {
        onOpenChange(false)
        setMessage('')
        setSelectedTemplate('')
      }, 500)
      
    } catch (error) {
      console.error('Error sending reminder:', error)
      // Error is also handled by parent component, but show local error for immediate feedback
      toast({
        title: '❌ Failed to Send Reminder',
        description: 'Failed to send payment reminder. Please try again.',
        variant: 'destructive',
        duration: 7000,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Ensure message is always a string
  const messageValue = typeof message === 'string' ? message : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Payment Reminder - AI & Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
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
              <span className="font-medium">Installment:</span>
              <span>#{paymentData.installmentNumber}{paymentData.totalInstallments ? ` of ${paymentData.totalInstallments}` : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={paymentData.status === 'overdue' ? 'destructive' : 'secondary'}>
                {paymentData.status}
                {paymentData.status === 'overdue' && paymentData.daysPastDue ? ` (${paymentData.daysPastDue} days)` : ''}
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

          {/* Message Source Tabs */}
          <Tabs value={messageSource} onValueChange={(value) => setMessageSource(value as 'ai' | 'template')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                AI Generate
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Use Template
              </TabsTrigger>
            </TabsList>

            {/* AI Generation Tab */}
            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">AI Generated Message</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateMessage}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate AI Message'}
                  </Button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  AI will create a personalized message based on payment status and details.
                </div>
                <Textarea
                  value={messageValue}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Click 'Generate AI Message' to create a personalized payment reminder..."
                  className="min-h-[200px]"
                  disabled={isGenerating}
                />
              </div>
            </TabsContent>

            {/* Template Selection Tab */}
            <TabsContent value="template" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Payment Reminder Template</label>
                {isLoadingTemplates ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading templates...
                  </div>
                ) : (
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={(value) => {
                      setSelectedTemplate(value)
                      if (value) {
                        loadTemplate(value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a payment reminder template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No payment reminder templates found
                        </SelectItem>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.name}</span>
                              <span className="text-xs text-gray-500">{template.category} • {template.channel}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <div className="text-sm text-gray-600 mb-2">
                  Templates will be automatically filled with payment details like parent name, amount, and due date.
                </div>
                <Textarea
                  value={messageValue}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Select a template above to load a pre-written payment reminder message..."
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
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
              disabled={isSending || !messageValue.trim() || isGenerating}
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