'use client'

import { useState, useEffect } from 'react'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { useToast } from '../../../hooks/use-toast'
import { 
  CreditCard, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Calendar,
  DollarSign,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Upload,
  Settings,
  RefreshCw,
  Loader2,
  Plus
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { PaymentProgress } from '../../../components/ui/payment-progress'
import { ModifyScheduleDialog } from '../../../components/ui/modify-schedule-dialog'
import { AiPaymentReminderDialog } from '../../../components/ui/ai-payment-reminder-dialog'
import { ReminderReviewDialog } from '../../../components/ui/reminder-review-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'

interface Payment {
  id: string
  amount: number
  dueDate: string
  paidAt: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  remindersSent: number
  notes: string | null
  parent: {
    _id?: string
    id: string
    name: string
    email: string
    phone?: string
    contracts?: Array<{
      id: string
      originalName: string
      fileName: string
      status: 'signed' | 'pending' | 'expired'
      signedAt: string | null
      uploadedAt: string
      expiresAt: string | null
      templateType: string | null
      fileUrl: string
    }>
    contractStatus?: 'signed' | 'pending' | 'expired'
    contractUrl?: string
    stripeCustomer?: {
      stripeCustomerId: string;
      balance: number;
      delinquent: boolean;
      subscriptions?: Array<{
        id: string;
        status: 'active' | 'trialing' | 'canceled';
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        trialEnd: string | null;
        stripeSubscriptionId: string;
      }>;
    } | null;
  } | null
  paymentPlan: {
    id: string
    type: string
    totalAmount: number
    installmentAmount: number
    description?: string
  } | null
  reminders?: Array<{
    id: string
    reminderType: string
    scheduledFor: string
    status: string
  }>
}

interface PaymentHistory {
  id: string
  action: string
  description: string
  performedBy: string
  performedAt: string
  amount?: number
  status?: string
  metadata?: any
}

interface CommunicationRecord {
  id: string
  subject: string
  body: string
  channel: 'email' | 'sms'
  status: 'sent' | 'delivered' | 'failed'
  sentAt: string
  template?: {
    name: string
    category: string
  }
}

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

function getStatusVariant(status: string) {
  switch (status) {
    case 'paid':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'secondary'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid':
      return <CheckCircle className="h-5 w-5" />
    case 'pending':
      return <Clock className="h-5 w-5" />
    case 'overdue':
      return <AlertTriangle className="h-5 w-5" />
    case 'cancelled':
      return <Eye className="h-5 w-5" />
    default:
      return <Clock className="h-5 w-5" />
  }
}

const paymentOptions = [
  {
    id: "stripe_card",
    name: "Credit/Debit Card",
    description: "Pay securely with your credit or debit card",
    icon: CreditCard,
    recommended: true,
    processingFee: "2.9% + $0.30"
  },
  {
    id: "stripe_ach",
    name: "Bank Transfer (ACH)",
    description: "Direct bank transfer with lower fees",
    icon: DollarSign,
    recommended: false,
    processingFee: "0.8%"
  },
  {
    id: "check",
    name: "Check Payment",
    description: "Traditional check payment",
    icon: FileText,
    recommended: false,
    processingFee: "None"
  },
  {
    id: "cash",
    name: "Cash Payment",
    description: "In-person cash payment",
    icon: DollarSign,
    recommended: false,
    processingFee: "None"
  }
]

const paymentSchedules = [
  { 
    value: "full", 
    label: "Full Payment",
    amount: "$1,699.59",
    description: "Pay the full amount now"
  },
  { 
    value: "quarterly", 
    label: "Quarterly",
    amount: "$566.74",
    description: "4 payments over 12 months (Total: $2,266.96)"
  },
  { 
    value: "monthly", 
    label: "Monthly",
    amount: "$189.11", 
    description: "9 payments over 9 months (Total: $1,701.99)"
  },
  { 
    value: "custom", 
    label: "Custom Schedule",
    amount: "Variable",
    description: "Set your own installments"
  },
]

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  // Early return if no payment ID
  if (!params?.id) {
    return <div>Payment ID not found</div>
  }
  const [payment, setPayment] = useState<Payment | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [communicationHistory, setCommunicationHistory] = useState<CommunicationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [commHistoryLoading, setCommHistoryLoading] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiReminderOpen, setAiReminderOpen] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentProgress, setPaymentProgress] = useState<PaymentProgressData | null>(null)
  
  // Dialog states
  const [modifyScheduleOpen, setModifyScheduleOpen] = useState(false)
  const [reminderReviewOpen, setReminderReviewOpen] = useState(false)
  const [paymentOptionsOpen, setPaymentOptionsOpen] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  
  // Custom installment states
  const [customInstallments, setCustomInstallments] = useState(3)
  const [customMonths, setCustomMonths] = useState(3)
  
  // Credit card form states
  const [showCreditCardForm, setShowCreditCardForm] = useState(false)
  const [creditCardForm, setCreditCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  })

  const [selectedInstallment, setSelectedInstallment] = useState<PaymentInstallment | null>(null)
  const [installmentPaymentOpen, setInstallmentPaymentOpen] = useState(false)
  const [payingInstallment, setPayingInstallment] = useState<PaymentInstallment | null>(null)
  const [aiGeneratedReminder, setAiGeneratedReminder] = useState<{
    subject: string
    message: string
    tone: string
  } | null>(null)

  // Payment scheduling state
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>("")
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [customInstallmentCount, setCustomInstallmentCount] = useState<number>(1)
  const [customPaymentFrequency, setCustomPaymentFrequency] = useState<number>(1)
  const [checkDetails, setCheckDetails] = useState({ 
    checkNumbers: [], 
    startDate: "",
    customAmount: ""
  })
  const [checkInstallments, setCheckInstallments] = useState<number>(1)
  const [checkFrequencyMonths, setCheckFrequencyMonths] = useState<number>(1)
  const [individualCheckNumbers, setIndividualCheckNumbers] = useState<string[]>([''])
  const [cashDetails, setCashDetails] = useState({ receiptNumber: "", paidDate: "" })

  // Collapsible state
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false)
  const [isCommunicationHistoryOpen, setIsCommunicationHistoryOpen] = useState(true)
  
  // Enhanced UX states
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // When check is chosen, force schedule to custom so the check UI/flow is enabled
  useEffect(() => {
    if (selectedPaymentOption === 'check') {
      setSelectedPaymentSchedule('custom')
    }
  }, [selectedPaymentOption])

  // TEMP: Force open the payment options popup so it always renders on load
  useEffect(() => {
    setPaymentOptionsOpen(true)
  }, [])

  useEffect(() => {
    console.log('🔍 useEffect triggered with params.id:', params.id)
    if (params.id) {
      fetchPaymentDetails()
      fetchPaymentHistory()
      fetchPaymentProgress()
    } else {
      console.log('🚨 No params.id available!')
      setError('Payment ID not found')
      setLoading(false)
    }
  }, [params.id])

  // Update individual check numbers array when installments change
  useEffect(() => {
    const newCheckNumbers = Array(checkInstallments).fill('').map((_, index) => 
      individualCheckNumbers[index] || ''
    )
    setIndividualCheckNumbers(newCheckNumbers)
  }, [checkInstallments])

  // Auto-refresh data every 30 seconds if there are pending payments
  useEffect(() => {
    if (payment?.status === 'pending' || payment?.status === 'overdue') {
      const interval = setInterval(() => {
        fetchPaymentDetails()
        fetchPaymentProgress()
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [payment?.status])

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchPaymentDetails(),
        fetchPaymentHistory(),
        fetchPaymentProgress()
      ])
      setLastActionTime(new Date())
      toast({
        title: '🔄 Data Refreshed',
        description: 'All payment information has been updated',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: '❌ Refresh Failed',
        description: 'Unable to refresh payment data',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (payment?.parent?.id) {
      fetchCommunicationHistory()
    }
  }, [payment?.parent?.id])

  const fetchPaymentDetails = async () => {
    try {
      console.log('🔍 Starting fetchPaymentDetails for ID:', params.id)
      setLoading(true)
      const response = await fetch(`/api/payments/${params.id}`)
      
      console.log('🔍 Fetch response status:', response.status)
      
      if (!response.ok) {
        console.log('🚨 Response not ok:', response.status, response.statusText)
        if (response.status === 404) {
          setError('Payment not found')
        } else {
          setError('Failed to load payment details')
        }
        return
      }

      const data = await response.json()
      console.log('🔍 Payment data received:', data ? 'SUCCESS' : 'NO DATA')
      setPayment(data)
      console.log('🔍 Payment state set successfully')
    } catch (error) {
      console.error('🚨 Error fetching payment:', error)
      setError('Failed to load payment details')
    } finally {
      console.log('🔍 Setting loading to false')
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/payments/${params.id}/history`)
      
      if (response.ok) {
        const data = await response.json()
        setPaymentHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const fetchCommunicationHistory = async () => {
    if (!payment?.parent?.id) return
    
    try {
      setCommHistoryLoading(true)
              const response = await fetch(`/api/communication/history?parentId=${payment.parent._id || payment.parent.id}&limit=10`)
      
      if (response.ok) {
        const data = await response.json()
        setCommunicationHistory(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching communication history:', error)
    } finally {
      setCommHistoryLoading(false)
    }
  }

  const fetchPaymentProgress = async () => {
    try {
      const response = await fetch(`/api/payments/${params.id}/progress`)
      
      if (response.ok) {
        const data = await response.json()
        setPaymentProgress(data)
      }
    } catch (error) {
      console.error('Error fetching payment progress:', error)
      // Don't show error toast for optional progress data
    }
  }

  const handleMarkAsPaid = async () => {
    if (!payment) return
    
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidAt: new Date().toISOString() })
      })

      if (response.ok) {
        const updatedPayment = await response.json()
        setPayment(updatedPayment)
        fetchPaymentHistory()
        toast({
          title: '✅ Payment Marked as Paid!',
          description: `Payment ID: ${payment.id} has been successfully marked as paid.`,
          duration: 5000,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: '❌ Error Marking as Paid',
          description: errorData.message || 'Failed to mark payment as paid.',
          variant: 'destructive',
          duration: 7000,
        })
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      toast({
        title: '❌ Error Marking as Paid',
        description: 'Failed to mark payment as paid due to an unexpected error.',
        variant: 'destructive',
        duration: 7000,
      })
    }
  }

  const handleSendReminder = async (message: string, method: 'email' | 'sms') => {
    if (!payment || !payment.parent?.id) return
    
    try {
      setSendingReminder(true)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [payment.parent._id || payment.parent.id],
          subject: 'Payment Reminder',
          body: message,
          channel: method,
          variables: {
            parentName: payment.parent.name,
            amount: payment.amount,
            dueDate: new Date(payment.dueDate).toLocaleDateString(),
            paymentId: payment.id
          }
        })
      })

      if (response.ok) {
        fetchPaymentDetails()
        fetchPaymentHistory()
        
        toast({
          title: '✅ Reminder Sent Successfully!',
          description: `Payment reminder sent to ${payment.parent.name} via ${method.toUpperCase()} for $${payment.amount}.`,
          duration: 5000,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: '❌ Failed to Send Reminder',
        description: error instanceof Error ? error.message : 'There was an error sending the payment reminder.',
        variant: 'destructive',
        duration: 7000,
      })
    } finally {
      setSendingReminder(false)
    }
  }

  const handleSendReminderReview = () => {
    if (!payment || !payment.parent) return
    
    const daysOverdue = payment.status === 'overdue' 
      ? Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    // Generate a professional reminder message
    const defaultMessage = `Dear ${payment.parent.name},

I hope this message finds you well. I wanted to reach out regarding your payment of $${payment.amount} that was due on ${new Date(payment.dueDate).toLocaleDateString()}.

${payment.status === 'overdue' && daysOverdue > 0 ? 
  `This payment is currently ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. ` : 
  'This payment is now due. '
}

We're here to help make this process as smooth as possible for you. If you have any questions about this payment or need assistance with payment options, please don't hesitate to reach out to us.

Thank you for your time and continued support of our basketball program.

Best regards,
The Basketball Factory Inc.`

    setAiGeneratedReminder({
      subject: 'Payment Reminder',
      message: defaultMessage,
      tone: 'professional'
    })
    setReminderReviewOpen(true)
  }

  const handleSendInstallmentReminder = async (installment: any) => {
    if (!payment || !payment.parent) return
    
    try {
      setSendingReminder(true)
      
      // Calculate days past due for this specific installment
      const daysOverdue = installment.status === 'overdue' 
        ? Math.floor((new Date().getTime() - new Date(installment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0
      
      // Generate professional installment reminder message instantly (no API call needed)
      const installmentMessage = `Dear ${payment.parent.name || 'Parent'},

I hope this message finds you well. I wanted to reach out regarding installment payment #${installment.installmentNumber} of $${installment.amount.toFixed(2)} that was due on ${new Date(installment.dueDate).toLocaleDateString()}.

${installment.status === 'overdue' && daysOverdue > 0 ? 
  `This installment payment is currently ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. ` : 
  'This installment payment is now due. '
}

This is installment ${installment.installmentNumber} of ${paymentProgress?.totalInstallments || 1} for your payment plan. We're here to help make this process as smooth as possible for you.

If you have any questions about this installment or need assistance with payment options, please don't hesitate to reach out to us.

Thank you for your time and continued support of our basketball program.

Best regards,
The Basketball Factory Inc.`
      
      // Store installment context for the AI reminder dialog
      setSelectedInstallment(installment)
      
      // Open the AI reminder dialog
      setAiReminderOpen(true)
    } catch (error) {
      console.error('Error generating installment reminder:', error)
      toast({
        title: '⚠️ Error',
        description: 'Failed to generate reminder. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setSendingReminder(false)
    }
  }



  const handlePaymentProcess = async () => {
    if (!payment || !selectedPaymentOption || !selectedPaymentSchedule) return

    try {
      setProcessingPayment(true)
      
      // Calculate payment amount based on schedule
      const baseAmount = parseFloat(String(payment.amount)) || 1699.59 // Fallback to a default amount
      console.log('Base payment data:', { 'payment.amount': payment.amount, baseAmount, selectedPaymentSchedule })
      let paymentAmount = baseAmount
      let installmentCount = 1
      let totalAmount = baseAmount
      
      switch (selectedPaymentSchedule) {
        case 'full':
          paymentAmount = baseAmount
          installmentCount = 1
          totalAmount = baseAmount
          break
        case 'quarterly':
          paymentAmount = 566.74 // Fixed quarterly amount
          installmentCount = 4
          totalAmount = paymentAmount * installmentCount // $2,266.96
          break
        case 'monthly':
          paymentAmount = 189.11 // Fixed monthly amount
          installmentCount = 9
          totalAmount = paymentAmount * installmentCount // $1,701.99
          console.log('Monthly payment calculation:', { paymentAmount, installmentCount, totalAmount })
          break
        case 'custom':
          paymentAmount = baseAmount / customInstallments
          installmentCount = customInstallments
          totalAmount = paymentAmount * installmentCount
          break
      }
      
      if (selectedPaymentOption === 'stripe_card') {
        // Validate credit card form
        if (!creditCardForm.cardNumber || !creditCardForm.expiryDate || !creditCardForm.cvv || !creditCardForm.cardholderName) {
          toast({
            title: 'Incomplete Credit Card Information',
            description: 'Please fill in all required credit card fields.',
            variant: 'destructive',
          })
          return
        }

        if (!creditCardForm.billingAddress.line1 || !creditCardForm.billingAddress.city || 
            !creditCardForm.billingAddress.state || !creditCardForm.billingAddress.postalCode) {
          toast({
            title: 'Incomplete Billing Address',
            description: 'Please fill in all required billing address fields.',
            variant: 'destructive',
          })
          return
        }
        
        // Process credit card payment and create installment schedule
        console.log('About to send API call:', { 
          paymentAmount, 
          totalAmount, 
          schedule: selectedPaymentSchedule, 
          installmentCount,
          amountInCents: Math.round(paymentAmount * 100),
          totalAmountInCents: Math.round(totalAmount * 100)
        })
        const response = await fetch('/api/payments/process-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentId: (payment as any)._id || payment.id,
            amount: Math.round(paymentAmount * 100), // Convert to cents
            totalAmount: Math.round(totalAmount * 100),
            paymentMethod: 'credit_card',
            schedule: selectedPaymentSchedule,
            installments: installmentCount,
            customInstallments: selectedPaymentSchedule === 'custom' ? customInstallments : undefined,
            customMonths: selectedPaymentSchedule === 'custom' ? customMonths : undefined,
            creditCardDetails: creditCardForm,
            parentId: payment.parent?.id
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to process payment')
        }

        const result = await response.json()
        
        // Show success message
        toast({
          title: '✅ Payment Processed Successfully!',
          description: `Credit card payment of $${paymentAmount.toFixed(2)} has been processed. ${installmentCount > 1 ? `${installmentCount} installment schedule created.` : ''}`,
          duration: 5000,
        })

        // Update the payment data to show progress
        await Promise.all([
          fetchPaymentDetails(),
          fetchPaymentProgress(),
          fetchPaymentHistory()
        ])

        // Refresh parent profile data if the refresh function is available
        if (typeof window !== 'undefined' && (window as any).refreshParentData) {
          try {
            await (window as any).refreshParentData()
            console.log('Parent profile data refreshed after successful payment')
          } catch (error) {
            console.warn('Failed to refresh parent profile data:', error)
          }
        }
        
        // Force a page refresh to ensure all data is updated
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        
      } else if (selectedPaymentOption === 'stripe_ach') {
        // Handle ACH/Bank Transfer
        const response = await fetch('/api/stripe/create-payment-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentId: payment.id,
            amount: Math.round(paymentAmount * 100),
            paymentMethod: 'bank_transfer',
            schedule: selectedPaymentSchedule,
            installments: installmentCount
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create bank transfer payment')
        }

        const { url } = await response.json()
        if (url) {
          window.open(url, '_blank')
        }
        
      } else {
        // Handle check and cash payments
        if (selectedPaymentOption === 'check' && selectedPaymentSchedule === 'custom') {
          // Build check numbers array from UI list
          const numbers = (individualCheckNumbers || [])
            .map(s => String(s).trim())
            .filter(Boolean)

          // Use customAmount if provided; otherwise fallback to per-installment amount
          const perInstallment = customAmount ? Number(customAmount) : paymentAmount

          const resp = await fetch(`/api/payments/${payment.id}/check-schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              installments: checkInstallments || customInstallments || installmentCount,
              frequency: checkFrequencyMonths || customPaymentFrequency || 1,
              installmentAmount: perInstallment,
              startDate: checkDetails.startDate || new Date().toISOString().slice(0,10),
              checkNumbers: numbers,
            })
          })
          if (!resp.ok) throw new Error('Failed to create check schedule')
          toast({ title: '✅ Check Schedule Saved', description: `Created ${checkInstallments || customInstallments} installments.` })
          await Promise.all([fetchPaymentDetails(), fetchPaymentProgress(), fetchPaymentHistory()])
        } else {
          const response = await fetch(`/api/payments/${payment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              paymentMethod: selectedPaymentOption,
              paymentReference: paymentReference,
              amount: paymentAmount,
              schedule: selectedPaymentSchedule,
              installments: installmentCount,
              status: 'pending'
            })
          })
          if (!response.ok) throw new Error('Failed to process payment')
          toast({ title: '✅ Payment Processed', description: `${selectedPaymentOption === 'check' ? 'Check' : 'Cash'} payment of $${paymentAmount.toFixed(2)} has been recorded.` })
          await Promise.all([fetchPaymentDetails(), fetchPaymentHistory()])
        }
      }
      
      // Close the dialog
      setPaymentOptionsOpen(false)
      
      // Reset form
      setCreditCardForm({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        billingAddress: {
          line1: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US'
        }
      })
      setSelectedPaymentOption('')
      setSelectedPaymentSchedule('')
      
    } catch (error) {
      console.error('Payment processing error:', error)
      toast({
        title: 'Payment Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process payment',
        variant: 'destructive',
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loading) {
    console.log('🔄 Page is in loading state')
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <div className="ml-4 text-sm text-gray-600">
            Loading payment details... (Check console for debug info)
          </div>
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {error || 'The payment you are looking for does not exist.'}
              </p>
              <Button asChild>
                <Link href="/payments">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Payments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const daysOverdue = payment.status === 'overdue' 
    ? Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/payments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Payments
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">PAYMENT DETAILS</h1>
              <Badge 
                variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {payment.status === 'paid' ? 'Paid' : payment.status === 'overdue' ? 'Overdue' : 'Pending'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              Communication
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-8">Payment ID: {payment.id}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Summary Card */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  PAYMENT SUMMARY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  {/* Amount Due/Remaining */}
                  <div className={`text-center p-4 rounded-lg ${
                    paymentProgress && paymentProgress.remainingAmount === 0 
                      ? 'bg-green-50' 
                      : paymentProgress && paymentProgress.remainingAmount > 0
                      ? 'bg-orange-50'
                      : 'bg-green-50'
                  }`}>
                    <DollarSign className={`h-8 w-8 mx-auto mb-2 ${
                      paymentProgress && paymentProgress.remainingAmount === 0 
                        ? 'text-green-600' 
                        : paymentProgress && paymentProgress.remainingAmount > 0
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`} />
                    <div className={`text-3xl font-bold ${
                      paymentProgress && paymentProgress.remainingAmount === 0 
                        ? 'text-green-600' 
                        : paymentProgress && paymentProgress.remainingAmount > 0
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      ${paymentProgress && paymentProgress.remainingAmount !== undefined 
                        ? paymentProgress.remainingAmount.toFixed(2) 
                        : payment.amount.toFixed(2)
                      }
                    </div>
                    <div className={`text-sm font-medium ${
                      paymentProgress && paymentProgress.remainingAmount === 0 
                        ? 'text-green-600' 
                        : paymentProgress && paymentProgress.remainingAmount > 0
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      {paymentProgress && paymentProgress.remainingAmount === 0 
                        ? 'Fully Paid' 
                        : 'Amount Remaining'
                      }
                    </div>
                  </div>

                  {/* Amount Paid */}
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <div className="text-3xl font-bold text-blue-600">
                      ${paymentProgress && paymentProgress.paidAmount !== undefined 
                        ? paymentProgress.paidAmount.toFixed(2) 
                        : '0.00'
                      }
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Amount Paid</div>
                  </div>

                  {/* Payment Progress */}
                  <div className={`text-center p-4 rounded-lg ${
                    paymentProgress && paymentProgress.progressPercentage === 100
                      ? 'bg-green-50' 
                      : paymentProgress && paymentProgress.progressPercentage > 0
                      ? 'bg-blue-50'
                      : payment.status === 'overdue'
                      ? 'bg-red-50'
                      : 'bg-yellow-50'
                  }`}>
                    {paymentProgress && paymentProgress.progressPercentage === 100 ? (
                      <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    ) : paymentProgress && paymentProgress.progressPercentage > 0 ? (
                      <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    ) : payment.status === 'overdue' ? (
                      <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                    ) : (
                      <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                    )}
                    <div className={`text-3xl font-bold ${
                      paymentProgress && paymentProgress.progressPercentage === 100
                        ? 'text-green-600' 
                        : paymentProgress && paymentProgress.progressPercentage > 0
                        ? 'text-blue-600'
                        : payment.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {paymentProgress && paymentProgress.progressPercentage !== undefined 
                        ? `${Math.round(paymentProgress.progressPercentage)}%`
                        : payment.status === 'paid' ? '100%' : '0%'
                      }
                    </div>
                    <div className={`text-sm font-medium ${
                      paymentProgress && paymentProgress.progressPercentage === 100
                        ? 'text-green-600' 
                        : paymentProgress && paymentProgress.progressPercentage > 0
                        ? 'text-blue-600'
                        : payment.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {paymentProgress && paymentProgress.progressPercentage === 100
                        ? 'Complete' 
                        : 'Progress'
                      }
                    </div>
                  </div>
                </div>

                {/* Payment Progress Summary */}
                {paymentProgress && paymentProgress.installments && paymentProgress.installments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {/* Progress Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Installments Paid</div>
                        <div className="text-lg font-bold text-gray-900">
                          {paymentProgress.paidInstallments} of {paymentProgress.totalInstallments}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Due Date</div>
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(payment.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Payment Progress</span>
                        <span className="font-medium">{Math.round(paymentProgress.progressPercentage)}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${paymentProgress.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Completed Status */}
                {paymentProgress && paymentProgress.progressPercentage === 100 && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Payment Plan Completed!</span>
                    <span className="text-green-700 ml-auto">
                      All installments have been paid
                    </span>
                  </div>
                )}

                {/* Single Payment Completed Status */}
                {payment.paidAt && (!paymentProgress || paymentProgress.installments.length <= 1) && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Payment Completed</span>
                    <span className="text-green-700 ml-auto">
                      Paid on {new Date(payment.paidAt).toLocaleDateString()} at {new Date(payment.paidAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Payment Notes */}
                {payment.notes && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Payment Notes</label>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      {payment.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Progress */}
            {paymentProgress && paymentProgress.installments && paymentProgress.installments.length > 0 && (
              <Card className="bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    PAYMENT PROGRESS
                  </CardTitle>
                  <CardDescription>
                    {paymentProgress.paidInstallments} of {paymentProgress.totalInstallments} payments completed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{Math.round(paymentProgress.progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${paymentProgress.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          ${paymentProgress.paidAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-green-600">Paid</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${paymentProgress.remainingAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-blue-600">Remaining</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          ${paymentProgress.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Payment Due */}
            {paymentProgress?.nextDue && (
              <Card className="bg-white border-orange-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                    NEXT PAYMENT DUE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold">Payment #{paymentProgress.nextDue.installmentNumber}</div>
                      <div className="text-sm text-gray-600">
                        Due: {new Date(paymentProgress.nextDue.dueDate).toLocaleDateString()}
                      </div>
                      <div className="text-2xl font-bold text-orange-600 mt-1">
                        ${paymentProgress.nextDue.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (paymentProgress.nextDue) {
                            const nextDueInstallment = {
                              _id: paymentProgress.nextDue.id,
                              installmentNumber: paymentProgress.nextDue.installmentNumber,
                              amount: paymentProgress.nextDue.amount,
                              dueDate: paymentProgress.nextDue.dueDate,
                              status: 'pending' as const,
                              remindersSent: 0
                            }
                            setPayingInstallment(nextDueInstallment)
                            setInstallmentPaymentOpen(true)
                          }
                        }}
                      >
                        Pay Now
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setModifyScheduleOpen(true)}>
                        Modify Schedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Schedule */}
            {paymentProgress && paymentProgress.installments && paymentProgress.installments.length > 0 && (
              <Card className="bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    PAYMENT SCHEDULE
                  </CardTitle>
                  <CardDescription>
                    Complete payment history and upcoming installments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paymentProgress.installments.map((installment, index) => (
                      <div key={installment._id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        installment.status === 'paid' 
                          ? 'bg-green-50 border-green-200' 
                          : installment.status === 'overdue'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            installment.status === 'paid' ? 'bg-green-600 text-white' :
                            installment.status === 'overdue' ? 'bg-red-600 text-white' :
                            installment.status === 'pending' ? 'bg-blue-600 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {installment.status === 'paid' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              installment.installmentNumber
                            )}
                          </div>
                          <div>
                            <div className="font-medium">Payment #{installment.installmentNumber}</div>
                            <div className="text-sm text-gray-600">
                              Due: {new Date(installment.dueDate).toLocaleDateString()}
                            </div>
                            {installment.status === 'paid' && installment.paidAt && (
                              <div className="text-xs text-green-600 mt-1">
                                Paid: {new Date(installment.paidAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold">${installment.amount.toFixed(2)}</div>
                            <Badge 
                              variant={
                                installment.status === 'paid' ? 'default' :
                                installment.status === 'overdue' ? 'destructive' :
                                'secondary'
                              }
                              className={`text-xs ${
                                installment.status === 'paid' ? 'bg-green-500 hover:bg-green-600' : ''
                              }`}
                            >
                              {installment.status === 'paid' ? 'Paid' : 
                               installment.status === 'overdue' ? 'Overdue' : 'Pending'}
                            </Badge>
                          </div>
                          {installment.status !== 'paid' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendInstallmentReminder(installment)}
                                className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                <Bell className="h-3 w-3" />
                                AI Reminder
                              </Button>
                              {installment.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setPayingInstallment(installment)
                                    setInstallmentPaymentOpen(true)
                                  }}
                                >
                                  Pay
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Collapsible open={isPaymentHistoryOpen} onOpenChange={setIsPaymentHistoryOpen}>
              <Card className="bg-white">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5" />
                        PAYMENT HISTORY
                      </div>
                      {isPaymentHistoryOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Track of all payment-related activities and status changes
                      {paymentProgress?.installments && (() => {
                        const paidCount = paymentProgress.installments.filter(i => i.status === 'paid').length;
                        const totalCount = paymentProgress.installments.length;
                        return paidCount > 0 ? (
                          <span className="ml-2 text-green-600 font-medium">
                            • {paidCount} of {totalCount} payments completed
                          </span>
                        ) : null;
                      })()}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading history...</span>
                      </div>
                    ) : (() => {
                      // Combine payment history and installment payments
                      const allHistoryEntries = [
                        ...paymentHistory.map((entry: any) => ({
                          ...entry,
                          type: 'history'
                        })),
                        ...(paymentProgress?.installments || [])
                          .filter(installment => installment.status === 'paid' && installment.paidAt)
                          .map(installment => ({
                            id: `payment_${installment._id}`,
                            action: 'Payment Received',
                            description: `Installment #${installment.installmentNumber} payment processed successfully via credit card`,
                            performedAt: installment.paidAt || Date.now(),
                            performedBy: payment.parent?.name || 'Parent',
                            amount: installment.amount,
                            type: 'payment',
                            installmentNumber: installment.installmentNumber
                          }))
                      ].sort((a: any, b: any) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

                      return allHistoryEntries.length > 0 ? (
                        <div className="space-y-4">
                          {allHistoryEntries.map((entry: any, index: number) => (
                            <div key={entry.id} className={`flex items-start space-x-4 p-4 border rounded-lg ${
                              entry.type === 'payment' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }`}>
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  entry.type === 'payment' 
                                    ? 'bg-green-600' 
                                    : 'bg-orange-600'
                                }`}>
                                  {entry.type === 'payment' ? (
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  ) : (
                                    <span className="text-white text-xs font-bold">{index + 1}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${
                                    entry.type === 'payment' ? 'text-green-800' : 'text-gray-900'
                                  }`}>
                                    {entry.action}
                                    {entry.type === 'payment' && entry.installmentNumber && (
                                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        Installment #{entry.installmentNumber}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(entry.performedAt).toLocaleDateString()} at {new Date(entry.performedAt).toLocaleTimeString()}
                                  </p>
                                </div>
                                <p className={`text-sm mt-1 ${
                                  entry.type === 'payment' ? 'text-green-700' : 'text-gray-600'
                                }`}>
                                  {entry.description}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-500">by {entry.performedBy}</p>
                                  {entry.amount && (
                                    <Badge 
                                      variant={entry.type === 'payment' ? 'default' : 'outline'} 
                                      className={`text-xs ${
                                        entry.type === 'payment' 
                                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                                          : ''
                                      }`}
                                    >
                                      ${typeof entry.amount === 'number' ? entry.amount.toFixed(2) : entry.amount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No History Available</h3>
                          <p className="text-gray-600">Payment history will appear here as actions are performed</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Communication History */}
            <Collapsible open={isCommunicationHistoryOpen} onOpenChange={setIsCommunicationHistoryOpen}>
              <Card className="bg-white">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-lg">
                        <MessageCircle className="h-5 w-5" />
                        COMMUNICATION HISTORY
                      </div>
                      {isCommunicationHistoryOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Recent messages and communications with {payment.parent?.name}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {commHistoryLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading communications...</span>
                      </div>
                    ) : communicationHistory.length > 0 ? (
                      <div className="space-y-4">
                        {communicationHistory.slice(0, 5).map((comm, index) => (
                          <div key={comm.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {comm.channel === 'email' ? (
                                  <Mail className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <MessageCircle className="h-4 w-4 text-green-500" />
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {comm.channel}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={comm.status === 'delivered' ? 'default' : comm.status === 'sent' ? 'secondary' : 'destructive'} className="text-xs">
                                  {comm.status}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(comm.sentAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-medium text-sm mb-2">
                              {comm.subject || 'No Subject'}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {comm.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h4 className="text-lg font-semibold mb-2">NO COMMUNICATIONS YET</h4>
                        <p className="text-gray-600 mb-4">
                          No messages have been sent to {payment.parent?.name} yet.
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            // Send First Message
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Send First Message
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Right Column - Parent Information */}
          <div className="space-y-6">
            {/* Parent Information */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  PARENT INFORMATION
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payment.parent ? (
                  <div className="space-y-4">
                    {/* Parent Avatar and Name */}
                    <div className="text-center pb-4 border-b">
                      <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-xl">
                          {payment.parent.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">{payment.parent.name}</h3>
                    </div>
                    
                    {/* Contact Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{payment.parent.email}</span>
                      </div>
                      {payment.parent.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{payment.parent.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* View Parent Profile Button */}
                    <div className="pt-4 border-t">
                      <Button asChild className="w-full bg-orange-600 hover:bg-orange-700" size="sm">
                        <Link 
                          href={`/parents/${payment.parent._id || payment.parent.id}`}
                          onClick={() => {
                            if (!payment.parent) {
                              console.error('No parent data available:', payment);
                              toast({
                                title: 'Error',
                                description: 'Parent information not available.',
                                variant: 'destructive',
                              });
                              return false;
                            }
                            const parentId = payment.parent._id || payment.parent.id;
                            console.log('=== PARENT PROFILE NAVIGATION DEBUG ===');
                            console.log('Payment data:', payment);
                            console.log('Parent data:', payment.parent);
                            console.log('Parent ID being used:', parentId);
                            console.log('Parent ID type:', typeof parentId);
                            console.log('Parent ID length:', parentId?.length);
                            console.log('Navigation URL:', `/parents/${parentId}`);
                            console.log('=== END DEBUG ===');
                            
                            if (!parentId) {
                              toast({
                                title: 'Error',
                                description: 'Parent ID not found. Cannot navigate to profile.',
                                variant: 'destructive',
                              });
                              return false;
                            }
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Parent Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No Parent Information</h4>
                    <p className="text-gray-600">Parent information is not available for this payment.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">QUICK ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stripe Integration */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      STRIPE INTEGRATION
                    </h4>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Link to open secure payment form
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => {
                      console.log('🔥 BUTTON CLICKED!')
                      alert('Button clicked! Opening dialog...')
                      setPaymentOptionsOpen(true)
                    }}
                  >
                    Choose payment option...
                  </Button>
                  <div className="mt-2 text-xs text-red-600">
                    DEBUG: paymentOptionsOpen = {String(paymentOptionsOpen)}
                  </div>
                </div>

                

                {/* Contract */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CONTRACT
                    </h4>
                    {payment.parent?.contracts && payment.parent.contracts.length > 0 ? (
                      <Badge variant={
                        payment.parent.contracts[0].status === 'signed' ? 'default' :
                        payment.parent.contracts[0].status === 'pending' ? 'secondary' :
                        'destructive'
                      }>
                        {payment.parent.contracts[0].status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Uploaded</Badge>
                    )}
                  </div>
                  
                  {payment.parent?.contracts && payment.parent.contracts.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">
                        {payment.parent.contracts[0].originalName}
                      </p>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/contracts/${payment.parent.contracts[0].id}`}>
                            Upload Contract
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">No contract uploaded yet</p>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/contracts/upload?parentId=${payment.parent?.id}`}>
                          <Upload className="mr-2 h-3 w-3" />
                          Upload Contract
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Communication */}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/communication">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Communication
                  </Link>
                </Button>

                {/* Send Reminder */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleSendReminderReview}
                  disabled={sendingReminder}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Send Reminder
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* All the existing dialogs remain the same */}
      <ModifyScheduleDialog
        open={modifyScheduleOpen}
        onOpenChange={setModifyScheduleOpen}
        installments={paymentProgress?.installments || []}
        paymentId={payment.id}
        onSave={async (modifiedSchedule) => {
          console.log('Modified schedule:', modifiedSchedule)
          window.location.reload()
        }}
      />

      <ReminderReviewDialog
        open={reminderReviewOpen}
        onOpenChange={setReminderReviewOpen}
        paymentData={{
          parentName: payment.parent?.name || '',
          parentEmail: payment.parent?.email || '',
          amount: payment.amount,
          dueDate: new Date(payment.dueDate).getTime(),
          status: payment.status
        }}
        initialMessage={aiGeneratedReminder?.message || ''}
        onSendReminder={async (message, method) => {
          await handleSendReminder(message, method)
        }}
        isSending={sendingReminder}
      />

      <AiPaymentReminderDialog
        open={aiReminderOpen}
        onOpenChange={(open) => {
          setAiReminderOpen(open)
          if (!open) {
            setSelectedInstallment(null) // Clear selected installment when dialog closes
          }
        }}
        paymentData={{
          parentName: payment.parent?.name || '',
          parentEmail: payment.parent?.email || '',
          amount: selectedInstallment ? selectedInstallment.amount : payment.amount,
          dueDate: selectedInstallment ? new Date(selectedInstallment.dueDate).getTime() : new Date(payment.dueDate).getTime(),
          installmentNumber: selectedInstallment ? selectedInstallment.installmentNumber : 1,
          totalInstallments: paymentProgress?.totalInstallments || 1,
          status: selectedInstallment ? selectedInstallment.status : payment.status,
          daysPastDue: selectedInstallment && selectedInstallment.status === 'overdue' 
            ? Math.floor((new Date().getTime() - new Date(selectedInstallment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            : daysOverdue
        }}
        onSendReminder={handleSendReminder}
      />

      {/* Enhanced Payment Options Dialog */}
      <Dialog open={paymentOptionsOpen} onOpenChange={setPaymentOptionsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <CreditCard className="h-6 w-6 text-orange-600" />
              Payment Options
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Choose your preferred payment method and schedule for this payment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Select Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedPaymentOption === option.id
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelectedPaymentOption(option.id)}
                  >
                    {option.recommended && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-orange-500 text-white">Recommended</Badge>
                      </div>
                    )}
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedPaymentOption === option.id ? 'bg-orange-100' : 'bg-gray-100'}`}>
                          <option.icon className={`h-6 w-6 ${selectedPaymentOption === option.id ? 'text-orange-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{option.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Processing Fee:</span>
                        <Badge variant={option.processingFee === "None" ? "secondary" : "outline"} className="text-xs">
                          {option.processingFee}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Payment Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSchedules.map((schedule) => (
                  <div
                    key={schedule.value}
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedPaymentSchedule === schedule.value
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => setSelectedPaymentSchedule(schedule.value)}
                  >
                    <div className="text-center space-y-2">
                      <h4 className="font-semibold text-lg">{schedule.label}</h4>
                      <p className="text-2xl font-bold text-orange-600">{schedule.amount}</p>
                      <p className="text-sm text-gray-600">{schedule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Installment Fields */}
            {selectedPaymentSchedule === 'custom' && (
              <div className="space-y-4 p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-medium">Custom Payment Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customInstallments">Number of Installments</Label>
                    <Select value={customInstallments.toString()} onValueChange={(value) => setCustomInstallments(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 9, 12].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} installments
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customMonths">Payment Period (Months)</Label>
                    <Select value={customMonths.toString()} onValueChange={(value) => setCustomMonths(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 9, 12, 18, 24].map((months) => (
                          <SelectItem key={months} value={months.toString()}>
                            {months} months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">
                      Payment Amount: ${(1699.59 / customInstallments).toFixed(2)} per installment
                    </p>
                    <p className="text-blue-700">
                      {customInstallments} payments of ${(1699.59 / customInstallments).toFixed(2)} over {customMonths} months
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Check Payment Fields - Simple Dropdowns and Text Boxes */}
            {selectedPaymentOption === 'check' && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Check Payment Details</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Number of Installments Dropdown */}
                  <div>
                    <Label className="text-sm font-medium">Installments</Label>
                    <Select value={String(checkInstallments)} onValueChange={(v) => setCheckInstallments(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Period Dropdown */}
                  <div>
                    <Label className="text-sm font-medium">Period (Months)</Label>
                    <Select value={String(checkFrequencyMonths)} onValueChange={(v) => setCheckFrequencyMonths(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Amount Text Box */}
                <div>
                  <Label className="text-sm font-medium">Amount per Check</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={checkDetails.customAmount}
                      onChange={(e) => setCheckDetails(prev => ({ ...prev, customAmount: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Dynamic Check Number Text Boxes */}
                <div>
                  <Label className="text-sm font-medium">Check Numbers ({checkInstallments} required)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {individualCheckNumbers.map((checkNumber, index) => (
                      <Input
                        key={index}
                        placeholder={`Check #${index + 1}`}
                        value={checkNumber}
                        onChange={(e) => {
                          const newCheckNumbers = [...individualCheckNumbers]
                          newCheckNumbers[index] = e.target.value
                          setIndividualCheckNumbers(newCheckNumbers)
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Simple Summary */}
                {checkDetails.customAmount && (
                  <div className="text-sm bg-white p-3 rounded border">
                    <strong>Total: ${(parseFloat(checkDetails.customAmount || '0') * checkInstallments).toFixed(2)}</strong>
                    <span className="text-gray-600 ml-2">({checkInstallments} × ${parseFloat(checkDetails.customAmount || '0').toFixed(2)})</span>
                  </div>
                )}
              </div>
            )}
            {selectedPaymentOption === 'cash' && (
              <div className="space-y-3">
                <Label htmlFor="paymentReference">Receipt Number</Label>
                <Input id="paymentReference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
              </div>
            )}

            {/* Credit Card Form */}
            {selectedPaymentOption === 'stripe_card' && (
              <div className="space-y-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Credit Card Information</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Card Details */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardholderName">Cardholder Name *</Label>
                      <Input
                        id="cardholderName"
                        value={creditCardForm.cardholderName}
                        onChange={(e) => setCreditCardForm(prev => ({
                          ...prev,
                          cardholderName: e.target.value
                        }))}
                        placeholder="John Doe"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number *</Label>
                      <Input
                        id="cardNumber"
                        value={creditCardForm.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
                          setCreditCardForm(prev => ({
                            ...prev,
                            cardNumber: value
                          }))
                        }}
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                        <Input
                          id="expiryDate"
                          value={creditCardForm.expiryDate}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2')
                            setCreditCardForm(prev => ({
                              ...prev,
                              expiryDate: value
                            }))
                          }}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          value={creditCardForm.cvv}
                          onChange={(e) => setCreditCardForm(prev => ({
                            ...prev,
                            cvv: e.target.value.replace(/\D/g, '')
                          }))}
                          placeholder="123"
                          maxLength={4}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-blue-900">Billing Address</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="billingAddress">Street Address *</Label>
                        <Input
                          id="billingAddress"
                          value={creditCardForm.billingAddress.line1}
                          onChange={(e) => setCreditCardForm(prev => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              line1: e.target.value
                            }
                          }))}
                          placeholder="123 Main Street"
                          className="bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={creditCardForm.billingAddress.city}
                            onChange={(e) => setCreditCardForm(prev => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                city: e.target.value
                              }
                            }))}
                            placeholder="New York"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={creditCardForm.billingAddress.state}
                            onChange={(e) => setCreditCardForm(prev => ({
                              ...prev,
                              billingAddress: {
                                ...prev.billingAddress,
                                state: e.target.value
                              }
                            }))}
                            placeholder="NY"
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={creditCardForm.billingAddress.postalCode}
                          onChange={(e) => setCreditCardForm(prev => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              postalCode: e.target.value
                            }
                          }))}
                          placeholder="10001"
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="p-4 bg-white border border-blue-300 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Method:</span>
                        <span className="text-sm font-medium">Credit Card</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Schedule:</span>
                        <span className="text-sm font-medium capitalize">
                          {paymentSchedules.find(s => s.value === selectedPaymentSchedule)?.label || selectedPaymentSchedule}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="text-sm font-medium">
                          {selectedPaymentSchedule === 'custom' 
                            ? `$${(payment.amount / customInstallments).toFixed(2)} per installment`
                            : paymentSchedules.find(s => s.value === selectedPaymentSchedule)?.amount || `$${payment.amount.toFixed(2)}`
                          }
                        </span>
                      </div>
                      {selectedPaymentSchedule === 'custom' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Installments:</span>
                          <span className="text-sm font-medium">{customInstallments} payments</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-semibold text-gray-900">Processing Fee:</span>
                        <span className="text-sm font-semibold text-gray-900">2.9% + $0.30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setPaymentOptionsOpen(false)
                // Reset form when closing
                setCreditCardForm({
                  cardNumber: '',
                  expiryDate: '',
                  cvv: '',
                  cardholderName: '',
                  billingAddress: {
                    line1: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'US'
                  }
                })
                setSelectedPaymentOption('')
                setSelectedPaymentSchedule('')
              }}
              className="flex-1"
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentProcess}
              disabled={
                !selectedPaymentOption || 
                !selectedPaymentSchedule || 
                processingPayment ||
                (selectedPaymentOption === 'stripe_card' && (
                  !creditCardForm.cardNumber || 
                  !creditCardForm.expiryDate || 
                  !creditCardForm.cvv || 
                  !creditCardForm.cardholderName ||
                  !creditCardForm.billingAddress.line1 ||
                  !creditCardForm.billingAddress.city ||
                  !creditCardForm.billingAddress.state ||
                  !creditCardForm.billingAddress.postalCode
                ))
              }
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {processingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : selectedPaymentOption === 'stripe_card' ? (
                `Process Credit Card Payment`
              ) : (
                'Process Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Installment Payment Dialog */}
      <Dialog open={installmentPaymentOpen} onOpenChange={setInstallmentPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Pay Installment #{payingInstallment?.installmentNumber}
            </DialogTitle>
            <DialogDescription>
              Pay ${payingInstallment?.amount.toFixed(2)} for installment #{payingInstallment?.installmentNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Payment Amount Summary */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-800">Amount Due:</span>
                <span className="text-2xl font-bold text-orange-600">
                  ${payingInstallment?.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-orange-600">Due Date:</span>
                <span className="text-xs text-orange-600">
                  {payingInstallment?.dueDate ? new Date(payingInstallment.dueDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Credit Card Form */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="installment-card-number">Card Number</Label>
                  <Input
                    id="installment-card-number"
                    placeholder="1234 5678 9012 3456"
                    value={creditCardForm.cardNumber}
                    onChange={(e) => setCreditCardForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="installment-cardholder-name">Cardholder Name</Label>
                  <Input
                    id="installment-cardholder-name"
                    placeholder="John Doe"
                    value={creditCardForm.cardholderName}
                    onChange={(e) => setCreditCardForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="installment-expiry">Expiry Date</Label>
                  <Input
                    id="installment-expiry"
                    placeholder="MM/YY"
                    value={creditCardForm.expiryDate}
                    onChange={(e) => setCreditCardForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="installment-cvv">CVV</Label>
                  <Input
                    id="installment-cvv"
                    placeholder="123"
                    value={creditCardForm.cvv}
                    onChange={(e) => setCreditCardForm(prev => ({ ...prev, cvv: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Processing Fee */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing Fee (2.9% + $0.30):</span>
                <span className="text-sm font-medium text-gray-800">
                  ${payingInstallment ? ((payingInstallment.amount * 0.029) + 0.30).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-300">
                <span className="text-sm font-semibold text-gray-900">Total:</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${payingInstallment ? (payingInstallment.amount + (payingInstallment.amount * 0.029) + 0.30).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setInstallmentPaymentOpen(false)
                setPayingInstallment(null)
                // Reset form
                setCreditCardForm({
                  cardNumber: '',
                  expiryDate: '',
                  cvv: '',
                  cardholderName: '',
                  billingAddress: {
                    line1: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'US'
                  }
                })
              }}
              className="flex-1"
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!payingInstallment || !payment) return
                
                try {
                  setProcessingPayment(true)
                  
                  const response = await fetch('/api/payments/process-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      paymentId: (payment as any)._id || payment.id,
                      amount: Math.round(payingInstallment.amount * 100), // Convert to cents
                      totalAmount: Math.round(payingInstallment.amount * 100), // Just this installment
                      paymentMethod: 'credit_card',
                      schedule: 'installment',
                      installments: 1,
                      installmentId: payingInstallment._id,
                      creditCardDetails: {
                        cardNumber: creditCardForm.cardNumber.replace(/\s/g, ''),
                        expiryDate: creditCardForm.expiryDate,
                        cvv: creditCardForm.cvv,
                        cardholderName: creditCardForm.cardholderName,
                        billingAddress: creditCardForm.billingAddress
                      }
                    })
                  })

                  if (response.ok) {
                    const result = await response.json()
                    
                    toast({
                      title: '✅ Payment Successful!',
                      description: `Installment #${payingInstallment.installmentNumber} payment of $${payingInstallment.amount.toFixed(2)} processed successfully.`,
                      duration: 5000,
                    })

                    // Close dialog and refresh data
                    setInstallmentPaymentOpen(false)
                    setPayingInstallment(null)
                    
                    // Refresh payment data
                    await Promise.all([
                      fetchPaymentDetails(),
                      fetchPaymentProgress(),
                      fetchPaymentHistory()
                    ])

                    // Refresh parent profile data if the refresh function is available
                    if (typeof window !== 'undefined' && (window as any).refreshParentData) {
                      try {
                        await (window as any).refreshParentData()
                        console.log('Parent profile data refreshed after successful payment')
                      } catch (error) {
                        console.warn('Failed to refresh parent profile data:', error)
                      }
                    }
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: '❌ Payment Failed',
                      description: errorData.error || 'Payment processing failed. Please try again.',
                      variant: 'destructive',
                      duration: 7000,
                    })
                  }
                } catch (error) {
                  console.error('Payment error:', error)
                  toast({
                    title: '❌ Payment Error',
                    description: 'An unexpected error occurred. Please try again.',
                    variant: 'destructive',
                    duration: 7000,
                  })
                } finally {
                  setProcessingPayment(false)
                }
              }}
              disabled={
                !creditCardForm.cardNumber || 
                !creditCardForm.expiryDate || 
                !creditCardForm.cvv || 
                !creditCardForm.cardholderName ||
                processingPayment
              }
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {processingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                `Pay $${payingInstallment?.amount.toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 