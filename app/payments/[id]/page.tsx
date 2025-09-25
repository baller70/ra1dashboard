'use client'

import { useState, useEffect, useRef } from 'react'
export const dynamic = 'force-dynamic'
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
  ChevronRight,
  ExternalLink,
  Upload,
  Settings,
  RefreshCw,
  Loader2,
  Plus,
  Sparkles,
  Receipt,
  Shield
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

import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import { Textarea } from '../../../components/ui/textarea'
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')


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

interface LeagueFeeData {
  _id: string
  amount: number
  processingFee?: number
  totalAmount: number
  paymentMethod: string
  status: string
  dueDate: number
  paidAt?: number
  stripePaymentLinkId?: string
  remindersSent: number
  lastReminderSent?: number
  notes?: string
  season: {
    _id: string
    name: string
    type: string
    year: number
  }
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
  notes?: string
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
  const [leagueFees, setLeagueFees] = useState<LeagueFeeData[]>([])
  const [leagueFeesDialogOpen, setLeagueFeesDialogOpen] = useState(false)
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
  // Manual installment marking dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [manualAction, setManualAction] = useState<'mark' | 'unmark'>('mark')
  const [manualTarget, setManualTarget] = useState<PaymentInstallment | null>(null)
  const [manualMethod, setManualMethod] = useState<string>('cash')
  const [manualNote, setManualNote] = useState<string>('')

  // Guard to prevent stale progress fetch from overwriting fresh server progress
  const [progressGuardUntil, setProgressGuardUntil] = useState<number>(0)
  // Temporary override to force immediate UI reflection in Summary/Progress
  const [summaryOverride, setSummaryOverride] = useState<{ paidAmount?: number; remainingAmount?: number; progressPercentage?: number } | null>(null)
  // UI version tick to force remount of Summary/Progress/Schedule blocks after manual actions
  const [uiVersion, setUiVersion] = useState<number>(0)
  // After a successful manual POST, we lock in the expected progress and only clear it
  // when a matching GET /progress returns. This prevents stale responses from reverting UI.
  const expectedProgressRef = useRef<{ paidAmount?: number; remainingAmount?: number; progressPercentage?: number; paidInstallments?: number } | null>(null)


  // AI Reminder Prompt state
  const [aiReminderPrompt, setAiReminderPrompt] = useState<string>('')
  const [generatingAiReminder, setGeneratingAiReminder] = useState(false)
  const [customAmountFromAI, setCustomAmountFromAI] = useState<number | null>(null)

  // Helper function to extract amount from AI prompt
  const extractAmountFromPrompt = (prompt: string): number | null => {
    if (!prompt) return null

    // Look for patterns like: $200, 200 dollars, 200$, $200.00, etc.
    const patterns = [
      /\$(\d+(?:\.\d{2})?)/,  // $200 or $200.00
      /(\d+(?:\.\d{2})?)\s*dollars?/i,  // 200 dollars
      /(\d+(?:\.\d{2})?)\$/,  // 200$
    ]

    for (const pattern of patterns) {
      const match = prompt.match(pattern)
      if (match) {
        return parseFloat(match[1])
      }
    }

    return null
  }

  // Stripe Payment Element state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)

  // Payment scheduling state
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>("")
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [customInstallmentCount, setCustomInstallmentCount] = useState<number>(1)
  // Button to confirm card payment using Stripe Elements
  function ConfirmStripeButton({ onDone }: { onDone?: () => Promise<void> | void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [submitting, setSubmitting] = useState(false)
    return (
      <Button
        className="bg-orange-600 hover:bg-orange-700"
        disabled={!stripe || !elements || submitting}
        onClick={async () => {
          if (!stripe || !elements) return
          setSubmitting(true)
          const result = await stripe.confirmPayment({ elements, redirect: 'if_required' })
          if ((result as any)?.error) {
            toast({ title: 'Card Error', description: (result as any).error.message || 'Payment failed', variant: 'destructive' })
            setSubmitting(false)
            return
          }
          try { await onDone?.() } catch {}
          setSubmitting(false)
        }}
      >
        {submitting ? 'Confirming…' : 'Confirm Card Payment'}
      </Button>
    )
  }

  const [customPaymentFrequency, setCustomPaymentFrequency] = useState<number>(1)
  const [checkDetails, setCheckDetails] = useState({
    checkNumbers: [],
    startDate: "",
    customAmount: ""
  })
  const [checkInstallments, setCheckInstallments] = useState<number>(1)
  const [checkFrequencyMonths, setCheckFrequencyMonths] = useState<number>(1)
  const [individualCheckNumbers, setIndividualCheckNumbers] = useState<string[]>([''])
  const [cashDetails, setCashDetails] = useState({
    receiptNumber: "",
    paidDate: "",
    customAmount: ""
  })
  const [cashInstallments, setCashInstallments] = useState<number>(1)
  const [cashFrequencyMonths, setCashFrequencyMonths] = useState<number>(1)


  // Collapsible state
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false)
  const [isCommunicationHistoryOpen, setIsCommunicationHistoryOpen] = useState(true)

  // Enhanced UX states
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // When check is chosen, force schedule to custom so the check UI/flow is enabled
  useEffect(() => {
    if (selectedPaymentOption === 'check' || selectedPaymentOption === 'cash') {
      setSelectedPaymentSchedule('custom')
    }
  }, [selectedPaymentOption])




  useEffect(() => {
    // If we just returned from Stripe Checkout, show success
    try {
      const usp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const status = usp.get('status')
      const sessionId = usp.get('session_id')
      if (status === 'success' && sessionId && ((payment as any)?._id || (payment as any)?.id)) {
        ;(async () => {
          try {
            const completeRes = await fetch(`/api/payments/${(payment as any)._id || payment.id}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentMethod: 'stripe_card', paymentPlan: 'full', sessionId })
            })
            if (!completeRes.ok) {
              // Fallback: directly PATCH the payment as paid if complete endpoint fails
              await fetch(`/api/payments/${(payment as any)._id || payment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paid', paidAt: new Date().toISOString(), notes: 'Auto-complete fallback' })
              })
            }
            toast({ title: '✅ Payment Successful', description: 'Your one-time payment was completed.' })
            // Optimistically reflect one-time card payment in history immediately
            try {
              setPaymentHistory(prev => [
                {
                  id: `card_full_${Date.now()}`,
                  action: 'Payment Received',
                  description: `One-time payment processed successfully via credit card`,
                  performedAt: new Date().toISOString(),
                  performedBy: payment.parent?.name || 'Parent',
                  amount: payment?.amount || 0,
                  status: 'paid',
                  metadata: { method: 'credit_card', optimistic: true },
                } as any,
                ...prev,
              ])
              setIsPaymentHistoryOpen(true)
              setHistoryLoading(false)
            } catch {}

            await Promise.all([fetchPaymentDetails(), fetchPaymentHistory(), fetchPaymentProgress()])
          } catch {}
        })()
      }
    } catch {}
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

  // Auto-refresh data every 5 minutes if there are pending payments (reduced frequency)
  useEffect(() => {
    if (payment?.status === 'pending' || payment?.status === 'overdue') {
      const interval = setInterval(() => {
        fetchPaymentDetails()
        fetchPaymentProgress()
      }, 300000) // 5 minutes instead of 30 seconds

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
    if (payment?.parent?.id || payment?.parent?._id || payment?.parentId) {
      fetchCommunicationHistory()
      fetchLeagueFees()
    }
  }, [payment?.parent?.id, payment?.parent?._id, payment?.parentId])

  const fetchPaymentDetails = async () => {
    try {
      console.log('🔍 Starting fetchPaymentDetails for ID:', params.id)
      setLoading(true)
      const response = await fetch(`/api/payments/${params.id}?t=${Date.now()}`, { cache: 'no-store' })

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
      setPayment(data)

      // Fetch league fees after payment data is loaded
      if (data?.parent?._id || data?.parent?.id || data?.parentId) {
        console.log('Payment data loaded, fetching league fees...')
        setTimeout(() => fetchLeagueFees(), 100) // Small delay to ensure state is updated
      }
    } catch (error) {
      console.error('Error fetching payment:', error)
      setError('Failed to load payment details')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/payments/${params.id}/history?t=${Date.now()}`, { cache: 'no-store' })

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
      // Prevent stale read-after-write from overwriting fresh server-calculated progress
      if (Date.now() < progressGuardUntil) {
        console.log('[Payment Page] Skipping progress fetch due to guard window');
        return;
      }

      const response = await fetch(`/api/payments/${params.id}/progress?t=${Date.now()}`, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        console.log('[Payment Page] Progress API response:', data);
        // Double-guard: skip applying stale responses that arrive during the guard window
        if (Date.now() < progressGuardUntil) {
          console.log('[Payment Page] Skipping applying progress due to guard window');
          return;
        }
        // If we have an expected progress signature, only accept a matching fresh value
        const expected = expectedProgressRef.current
        if (expected) {
          const matches =
            typeof data?.paidAmount === 'number' &&
            typeof data?.progressPercentage === 'number' &&
            typeof data?.paidInstallments === 'number' &&
            Math.round(data.progressPercentage) === Math.round((expected.progressPercentage ?? data.progressPercentage) as number) &&
            data.paidAmount === (expected.paidAmount ?? data.paidAmount) &&
            data.paidInstallments === (expected.paidInstallments ?? data.paidInstallments)

          if (!matches) {
            console.log('[Payment Page] Ignoring stale/unconfirmed progress that does not match expected server progress; retrying shortly')
            setTimeout(() => { try { fetchPaymentProgress() } catch {} }, 1000)
            return
          }
          // Matched the expected fresh server progress; clear override and lock
          expectedProgressRef.current = null
          setSummaryOverride(null)
        }
        setPaymentProgress(data)
      }
    } catch (error) {
      console.error('Error fetching payment progress:', error)
      // Don't show error toast for optional progress data
    }
  }

  const fetchLeagueFees = async () => {
    // Get parent ID from payment object or URL
    const parentId = payment?.parent?._id || payment?.parent?.id || payment?.parentId

    if (!parentId) {
      console.log('No parent ID available for league fees fetch')
      return
    }

    try {
      console.log('Fetching league fees for parent ID:', parentId)
      const response = await fetch(`/api/league-fees?parentId=${parentId}`)

      if (response.ok) {
        const data = await response.json()
        console.log('League fees data received:', data)
        setLeagueFees(data.data || [])
      } else {
        console.warn('Failed to fetch league fees:', response.status)
      }
    } catch (error) {
      console.error('Error fetching league fees:', error)
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
            parentName: getEmergencyContactFirstName(payment.parent), // Use emergency contact first name
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

    // Generate a professional reminder message using emergency contact first name
    const recipientName = getEmergencyContactFirstName(payment.parent)
    const defaultMessage = `Dear ${recipientName},

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

  // Helper function to get emergency contact first name
  const getEmergencyContactFirstName = (parent: any): string => {
    if (parent?.emergencyContact) {
      // Extract first name from emergency contact (e.g., "Kevin Houston" -> "Kevin")
      const firstName = parent.emergencyContact.split(' ')[0]
      return firstName || parent.emergencyContact
    }
    // Fallback to parent name if no emergency contact
    return parent?.name?.split(' ')[0] || 'Parent'
  }

  // AI Generate Reminder function - PROPER AI INTEGRATION
  const handleAiGenerateReminder = async () => {
    if (!payment || !payment.parent) return

    try {
      setGeneratingAiReminder(true)

      // Use emergency contact first name as recipient
      const recipientName = getEmergencyContactFirstName(payment.parent)

      const requestBody = {
        context: {
          parentId: payment.parent._id || payment.parent.id,
          paymentId: payment._id || payment.id,
          parentName: recipientName, // Use emergency contact first name
          parentEmail: payment.parent.email,
          amount: payment.amount,
          dueDate: payment.dueDate,
          status: payment.status,

          messageType: 'reminder'
        },
        customInstructions: aiReminderPrompt.trim() || null,
        includePersonalization: true,
      }

      console.log('🔥 FRONTEND: Sending custom instructions:', aiReminderPrompt.trim())
      console.log('🔥 FRONTEND: Request body:', requestBody)

      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate message: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔥 FRONTEND: API response:', data)

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate message')
      }

      // Extract custom amount from AI prompt if present
      const extractedAmount = extractAmountFromPrompt(aiReminderPrompt.trim())
      if (extractedAmount) {
        setCustomAmountFromAI(extractedAmount)
      }

      // Set the generated reminder and open the review dialog
      setAiGeneratedReminder({
        subject: data.subject || 'Payment Reminder',
        message: data.message,
        tone: 'professional'
      })

      setReminderReviewOpen(true)

      toast({
        title: '✨ AI Reminder Generated',
        description: 'Your personalized reminder message has been created. Review and send it below.',
        duration: 5000,
      })

    } catch (error) {
      console.error('Error generating AI reminder:', error)
      toast({
        title: '⚠️ AI Generation Failed',
        description: 'Failed to generate AI reminder. Please try again or use the standard reminder.',
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setGeneratingAiReminder(false)
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
        // If full one-time payment, process in-app via PaymentIntent (no redirect)
        if (selectedPaymentSchedule === 'full') {
          const response = await fetch('/api/stripe/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: (payment.parent as any)?._id || payment.parent?.id,
              paymentId: (payment as any)._id || payment.id,
              amount: Math.round(paymentAmount * 100), // cents
              description: `One-time payment for ${payment.parent?.name || 'tuition'}`,
            }),
          })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create payment intent')
          }

          const { clientSecret } = await response.json()
          setStripeClientSecret(clientSecret)
          toast({ title: 'Secure Card Form Ready', description: 'Enter your card in the secure Stripe form, then confirm.' })
          setProcessingPayment(false)
          return
        }

        // For installment schedules, keep current mock processing for now
        const response = await fetch('/api/payments/process-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: (payment as any)._id || payment.id,
            amount: Math.round(paymentAmount * 100),
            totalAmount: Math.round(totalAmount * 100),
            paymentMethod: 'stripe_card',
            schedule: selectedPaymentSchedule,
            installments: installmentCount,
            customInstallments: selectedPaymentSchedule === 'custom' ? customInstallments : undefined,
            customMonths: selectedPaymentSchedule === 'custom' ? customMonths : undefined,
            creditCardDetails: creditCardForm,
            parentId: (payment.parent as any)?._id || payment.parent?.id
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to process payment')
        }

        const result = await response.json()
        toast({
          title: '✅ Payment Processed Successfully!',
          description: `Credit card payment of $${paymentAmount.toFixed(2)} has been processed. ${installmentCount > 1 ? `${installmentCount} installment schedule created.` : ''}`,
          duration: 5000,
        })

        await Promise.all([fetchPaymentDetails(), fetchPaymentProgress(), fetchPaymentHistory()])
        if (typeof window !== 'undefined' && (window as any).refreshParentData) {
          try { await (window as any).refreshParentData() } catch {}
        }
        setTimeout(() => { window.location.reload() }, 2000)
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
          const perInstallment = checkDetails.customAmount ? Number(checkDetails.customAmount) : paymentAmount

          const resp = await fetch(`/api/payments/${payment.id}/custom-schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              installments: checkInstallments || customInstallments || installmentCount,
              frequency: checkFrequencyMonths || customPaymentFrequency || 1,
              installmentAmount: perInstallment,
              startDate: checkDetails.startDate || new Date().toISOString().slice(0,10),
              checkNumbers: numbers,
              paymentMethod: 'check'
            })
          })
          if (!resp.ok) throw new Error('Failed to create check schedule')
          toast({ title: '✅ Check Schedule Saved', description: `Created ${checkInstallments || customInstallments} installments.` })
          await Promise.all([fetchPaymentDetails(), fetchPaymentProgress(), fetchPaymentHistory()])
        } else if (selectedPaymentOption === 'cash' && selectedPaymentSchedule === 'custom') {
          const perInstallment = cashDetails.customAmount ? Number(cashDetails.customAmount) : paymentAmount
          const resp = await fetch(`/api/payments/${payment.id}/custom-schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              installments: cashInstallments || customInstallments || installmentCount,
              frequency: cashFrequencyMonths || customPaymentFrequency || 1,
              installmentAmount: perInstallment,
              startDate: new Date().toISOString().slice(0,10),
              paymentMethod: 'cash'
            })
          })
          if (!resp.ok) throw new Error('Failed to create cash schedule')
          toast({ title: '✅ Cash Schedule Saved', description: `Created ${cashInstallments || customInstallments} installments.` })
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

  // Manual installment mark/unmark handlers (component scope)
  const openManualDialog = (installment: any, action: 'mark' | 'unmark') => {
    setManualTarget(installment)
    setManualAction(action)
    setManualMethod('cash')
    setManualNote('')
    setManualDialogOpen(true)
  }

  const handleManualConfirm = async () => {
    if (!manualTarget) return
    try {
      const resp = await fetch(`/api/installments/${manualTarget._id}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markPaid: manualAction === 'mark',
          method: manualMethod,
          note: manualNote,
          actor: 'admin',
          parentPaymentId: (payment as any)?._id || (payment as any)?.id || params.id,
        }),
      })
      const json = await resp.json().catch(() => ({} as any))
      if (!resp.ok || json?.success === false) {
        const msg = json?.error || (await resp.text()).slice(0, 500) || 'Failed to update installment'
        throw new Error(msg)
      }

      // Prefer server-calculated progress when provided (strong read-after-write)
      if (json?.progress) {
        console.log('[Payment Page] Applying server progress', json.progress);
        setPaymentProgress(json.progress as any)
        // Force immediate UI reflection for Summary/Progress
        setSummaryOverride({
          paidAmount: (json.progress as any).paidAmount,
          remainingAmount: (json.progress as any).remainingAmount,
          progressPercentage: (json.progress as any).progressPercentage,
        })
        // Lock in expected progress until a matching fresh GET confirms it; do not auto-clear
        expectedProgressRef.current = {
          paidAmount: (json.progress as any).paidAmount,
          remainingAmount: (json.progress as any).remainingAmount,
          progressPercentage: (json.progress as any).progressPercentage,
          paidInstallments: (json.progress as any).paidInstallments,
        }
        // Guard against stale overwrites for a longer window to ensure consistency
        setProgressGuardUntil(Date.now() + 15000)
        // Force remount of key UI blocks to ensure immediate visual update
        setUiVersion(v => v + 1)
      } else {
        // Optimistic UI update: flip the status locally so the button toggles immediately
        setPaymentProgress((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            installments: prev.installments.map((i) =>
              i._id === manualTarget._id
                ? { ...i, status: manualAction === 'mark' ? 'paid' : 'pending', paidAt: manualAction === 'mark' ? Date.now() : undefined }
                : i
            ),
          }
        })
        setProgressGuardUntil(Date.now() + 15000)
        setUiVersion(v => v + 1)
      }

      toast({ title: manualAction === 'mark' ? '✅ Marked as Paid' : '↩️ Reverted', description: manualAction === 'mark' ? `Installment #${manualTarget.installmentNumber} marked as paid manually.` : `Installment #${manualTarget.installmentNumber} reverted to pending.` })

      // Immediately reflect in Payment History list without waiting for server
      try {
        const newEntry = {
          id: `manual_${manualTarget._id}_${Date.now()}`,
          action: manualAction === 'mark' ? 'Payment Received' : 'Payment Reverted',
          description: manualAction === 'mark'
            ? `Installment #${manualTarget.installmentNumber} manually recorded as paid (${manualMethod || 'manual'})`
            : `Manual payment for installment #${manualTarget.installmentNumber} reverted to pending`,
          performedBy: 'admin',
          performedAt: new Date().toISOString(),
          amount: manualTarget.amount,
          status: manualAction === 'mark' ? 'paid' : 'pending',
          metadata: { installmentId: manualTarget._id, method: manualMethod || 'manual', note: manualNote || '' },
        } as any
        setPaymentHistory(prev => [newEntry, ...(prev || [])])
      } catch {}

      setManualDialogOpen(false)
      setManualTarget(null)
      // Also refresh details/history immediately; delay progress fetch to avoid read-after-write
      await Promise.all([fetchPaymentDetails(), fetchPaymentHistory()])
      // Allow extra time for DB consistency before re-fetching progress
      setTimeout(() => { try { setProgressGuardUntil(0); fetchPaymentProgress(); } catch {} }, 12000)
    } catch (e: any) {
      console.error('Manual mark error:', e)
      toast({ title: 'Error', description: e?.message || 'Failed to update installment', variant: 'destructive' })
    }
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
            <Card key={`summary-${uiVersion}`} className="bg-white">
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
                    <div data-testid="amount-remaining" className={`text-3xl font-bold ${
                      paymentProgress && paymentProgress.remainingAmount === 0
                        ? 'text-green-600'
                        : paymentProgress && paymentProgress.remainingAmount > 0
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      ${Number((summaryOverride && summaryOverride.remainingAmount !== undefined)
                        ? summaryOverride.remainingAmount
                        : (paymentProgress && paymentProgress.remainingAmount !== undefined)
                        ? paymentProgress.remainingAmount
                        : (payment && (payment as any).amount)) .toFixed(2)}
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
                    <div data-testid="amount-paid" className="text-3xl font-bold text-blue-600">
                      ${Number((summaryOverride && summaryOverride.paidAmount !== undefined)
                        ? summaryOverride.paidAmount
                        : (paymentProgress && paymentProgress.paidAmount !== undefined)
                        ? paymentProgress.paidAmount
                        : 0).toFixed(2)}
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
                    <div data-testid="progress-percentage" className={`text-3xl font-bold ${
                      paymentProgress && paymentProgress.progressPercentage === 100
                        ? 'text-green-600'
                        : paymentProgress && paymentProgress.progressPercentage > 0
                        ? 'text-blue-600'
                        : payment.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {(summaryOverride && summaryOverride.progressPercentage !== undefined)
                        ? `${Math.round(summaryOverride.progressPercentage!)}%`
                        : (paymentProgress && paymentProgress.progressPercentage !== undefined)
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
                          ${Number(paymentProgress?.paidAmount ?? 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-green-600">Paid</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${Number(paymentProgress?.remainingAmount ?? 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-blue-600">Remaining</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          ${Number(paymentProgress?.totalAmount ?? 0).toFixed(2)}
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
                        Due: {paymentProgress?.nextDue?.dueDate ? new Date(paymentProgress.nextDue.dueDate).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-2xl font-bold text-orange-600 mt-1">
                        ${Number(paymentProgress?.nextDue?.amount ?? 0).toFixed(2)}
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
              <Card key={`schedule-${uiVersion}`} className="bg-white">
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
                            <div className="font-bold">${Number((installment as any)?.amount ?? 0).toFixed(2)}</div>
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
                          {installment.status === 'paid' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openManualDialog(installment, 'unmark')}
                                className="flex items-center gap-1 text-gray-700 border-gray-200 hover:bg-gray-50"
                              >
                                Unmark
                              </Button>
                            </div>
                          )}

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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openManualDialog(installment, 'mark')}
                                className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Mark as Paid
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
                            description: (() => {
                              try {
                                const parsed = JSON.parse((installment as any).notes || '{}')
                                if (parsed?.manualPayment) {
                                  const m = parsed.manualPayment.method || 'manual'
                                  return `Installment #${installment.installmentNumber} manually recorded as paid (${m})`
                                }
                              } catch {}
                              return `Installment #${installment.installmentNumber} payment processed successfully via credit card`
                            })(),
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
                    {payment?.parent?.stripeCustomerId ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Link to open secure payment form
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setPaymentOptionsOpen(true)
                    }}
                  >
                    Choose payment option...
                  </Button>
                </div>

                  {/* Admin: Mark Paid (visible with ?admin=1) */}
                  {typeof window !== 'undefined' && window.location.search.includes('admin=1') && payment?.status !== 'paid' && (
                    <div className="mt-2">
                      <Button variant="destructive" size="sm" onClick={handleMarkAsPaid}>
                        Mark Paid (Admin)
                      </Button>
                    </div>
                  )}




                {/* Contract */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CONTRACT
                    </h4>
                    {(() => {
                      const firstContract = payment.parent?.contracts && payment.parent.contracts.length > 0 ? payment.parent.contracts[0] : null
                      const statusText = (firstContract?.status || payment.parent?.contractStatus || 'pending') as string
                      const badgeVariant =
                        statusText === 'signed' ? 'default' :
                        statusText === 'pending' ? 'secondary' :
                        'destructive'
                      return (
                        <Badge variant={badgeVariant as any}>{statusText === 'signed' ? 'Signed' : statusText}</Badge>
                      )
                    })()}
                  </div>
                  {(() => {
                    const firstContract = payment.parent?.contracts && payment.parent.contracts.length > 0 ? payment.parent.contracts[0] : null
                    const hasContract = !!firstContract || (payment.parent?.contractStatus && payment.parent.contractStatus.toLowerCase() !== 'pending')
                    if (hasContract && firstContract) {
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">{firstContract.originalName}</p>
                          <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" className="flex-1">
                              <Link href={`/contracts/${firstContract.id}`}>
                                View Contract
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    }
                    if (hasContract) {
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">Contract on file</p>
                          <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" className="w-full">
                              <Link href={`/contracts?parentId=${payment.parent?._id || payment.parent?.id}`}>
                                View Contracts
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">No contract uploaded yet</p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link href={`/contracts/upload?parentId=${payment.parent?._id || payment.parent?.id}`}>
                            <Upload className="mr-2 h-3 w-3" />
                            Upload Contract
                          </Link>
                        </Button>
                      </div>
                    )
                  })()}
                </div>

                {/* League Fees */}
                <div
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setLeagueFeesDialogOpen(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <h4 className="text-sm font-medium">LEAGUE FEES</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{leagueFees.length}</Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {leagueFees.length > 0
                      ? `${leagueFees.filter(f => f.status === 'pending').length} pending, ${leagueFees.filter(f => f.status === 'paid').length} paid`
                      : 'Season fees for Summer League and Fall Tournament'
                    }
                  </p>
                </div>

                {/* Admin Panel */}
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-600" />
                      ADMIN PANEL
                    </h4>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">Admin</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Manage league fees and season settings
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full border-orange-300 text-orange-700 hover:bg-orange-100">
                    <Link href="/admin/seasons">
                      <Shield className="mr-2 h-3 w-3" />
                      Manage League Fees
                    </Link>
                  </Button>
                </div>

                {/* Communication */}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/communication">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Communication
                  </Link>
                </Button>

                {/* AI Reminder Section */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      AI Reminder Prompt (optional)
                    </label>
                    <textarea
                      value={aiReminderPrompt}
                      onChange={(e) => setAiReminderPrompt(e.target.value)}
                      placeholder="you owe me $213 please pay before next game"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAiGenerateReminder}
                    disabled={generatingAiReminder || !payment?.parent}
                  >
                    {generatingAiReminder ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Generate Reminder
                      </>
                    )}
                  </Button>
                </div>

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
        onOpenChange={(open) => {
          setReminderReviewOpen(open)
          if (!open) {
            // Reset custom amount when dialog closes
            setCustomAmountFromAI(null)
          }
        }}
        paymentData={{
          parentName: getEmergencyContactFirstName(payment.parent), // Use emergency contact first name
          parentEmail: payment.parent?.email || '',
          amount: customAmountFromAI || payment.amount, // Use custom amount if available
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

            {/* Cash Payment Fields */}
            {selectedPaymentOption === 'cash' && (
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-3">Cash Payment Details</h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Number of Installments Dropdown */}
                  <div>
                    <Label className="text-sm font-medium">Installments</Label>
                    <Select value={String(cashInstallments)} onValueChange={(v) => setCashInstallments(Number(v))}>
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
                    <Select value={String(cashFrequencyMonths)} onValueChange={(v) => setCashFrequencyMonths(Number(v))}>
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
                  <Label className="text-sm font-medium">Amount per Payment</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cashDetails.customAmount}
                      onChange={(e) => setCashDetails(prev => ({ ...prev, customAmount: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Dynamic Cash Payment Labels */}
                <div>
                  <Label className="text-sm font-medium">Cash Payments ({cashInstallments} required)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Array.from({ length: cashInstallments }).map((_, index) => (
                      <div key={index} className="flex items-center p-2 bg-white border rounded-md">
                        <span className="text-sm">Cash Payment #{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simple Summary */}
                {cashDetails.customAmount && (
                  <div className="text-sm bg-white p-3 rounded border">
                    <strong>Total: ${(parseFloat(cashDetails.customAmount || '0') * cashInstallments).toFixed(2)}</strong>
                    <span className="text-gray-600 ml-2">({cashInstallments} × ${parseFloat(cashDetails.customAmount || '0').toFixed(2)})</span>
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
                  {/* Stripe Payment Element (secure) */}
                  {stripeClientSecret && (
                    <Elements options={{ clientSecret: stripeClientSecret }} stripe={stripePromise}>
                      <div className="space-y-4 bg-white p-4 rounded border">
                        <PaymentElement />
                      </div>
                    </Elements>
                  )}

                  {/* Legacy native inputs hidden when using Stripe */}
                  {!stripeClientSecret && (
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

                  )}

                  {/* Billing Address */}
                  {!stripeClientSecret && (
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
                  )}
                  {stripeClientSecret && (
                    <div className="pt-4">
                      <ConfirmStripeButton onDone={async () => {
                        try {
                          toast({ title: '✅ Payment Confirmed', description: 'Card payment confirmed. Syncing...' })
                          await Promise.all([fetchPaymentDetails(), fetchPaymentProgress(), fetchPaymentHistory()])
                        } catch {}
                        setPaymentOptionsOpen(false)
                        try { await (window as any).refreshParentData?.() } catch {}
                      }} />
                    </div>
                  )}


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
                            : paymentSchedules.find(s => s.value === selectedPaymentSchedule)?.amount || `$${Number((payment as any)?.amount ?? 0).toFixed(2)}`
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
                // When using Stripe card, allow creating PI without native inputs; disable only after PI exists
                (selectedPaymentOption === 'stripe_card' && Boolean(stripeClientSecret))
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

                    // Optimistically reflect in Payment History immediately
                    try {
                      setPaymentHistory(prev => [
                        {
                          id: `card_${(payingInstallment as any)?._id || 'inst'}_${Date.now()}`,
                          action: 'Payment Received',
                          description: `Installment #${payingInstallment.installmentNumber} payment processed successfully via credit card`,
                          performedAt: new Date().toISOString(),
                          performedBy: payment.parent?.name || 'Parent',
                          amount: payingInstallment.amount,
                          status: 'paid',
                          metadata: { installmentId: (payingInstallment as any)?._id, method: 'credit_card', optimistic: true },
                        } as any,
                        ...prev,
                      ])
                      setIsPaymentHistoryOpen(true)
                      setHistoryLoading(false)
                    } catch {}


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

      {/* Manual Installment Mark/Unmark Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {manualAction === 'mark' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Mark Installment #{manualTarget?.installmentNumber} as Paid
                </>
              ) : (
                <>Revert Manual Payment</>
              )}
            </DialogTitle>
            <DialogDescription>
              {manualAction === 'mark'
                ? `This will mark installment #${manualTarget?.installmentNumber} as paid without charging their stored payment method. You can note how payment was collected.`
                : `This will revert installment #${manualTarget?.installmentNumber} back to pending.`}
            </DialogDescription>
          </DialogHeader>

          {manualAction === 'mark' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={manualMethod} onValueChange={setManualMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="e.g., Collected cash at practice on 9/21"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Cancel</Button>
            <Button
              variant={manualAction === 'mark' ? 'default' : 'destructive'}
              onClick={handleManualConfirm}
            >
              {manualAction === 'mark' ? 'Confirm Mark as Paid' : 'Confirm Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* League Fees Dialog */}
      <Dialog open={leagueFeesDialogOpen} onOpenChange={setLeagueFeesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              League Fees
            </DialogTitle>
            <DialogDescription>
              Season fees for Summer League and Fall Tournament programs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {leagueFees.length > 0 ? (
              leagueFees.map((fee) => (
                <div key={fee._id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-lg">{fee.season.name}</h4>
                        <Badge
                          variant={
                            fee.status === 'paid' ? 'default' :
                            fee.status === 'overdue' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {fee.status === 'paid' ? 'Paid' : fee.status === 'overdue' ? 'Overdue' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {fee.season.type === 'summer_league' ? 'Summer League Fee' : 'Fall Tournament Fee'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">${fee.amount}</p>
                      {fee.processingFee && (
                        <p className="text-xs text-muted-foreground">
                          + ${fee.processingFee} processing fee
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium text-lg">${Number((fee as any)?.totalAmount ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">
                        {fee.paymentMethod === 'online' ? 'Online Payment' : 'In-Person Payment'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {new Date(fee.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {fee.paidAt && (
                    <div className="mb-3">
                      <p className="text-sm text-green-600">
                        ✓ Paid on {new Date(fee.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {fee.remindersSent > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground">
                        {fee.remindersSent} reminder{fee.remindersSent > 1 ? 's' : ''} sent
                        {fee.lastReminderSent && (
                          <span> (last: {new Date(fee.lastReminderSent).toLocaleDateString()})</span>
                        )}
                      </p>
                    </div>
                  )}

                  {fee.status !== 'paid' && (
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/league-fees/send-reminder', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                leagueFeeId: fee._id,
                                parentId: payment?.parent?._id || payment?.parent?.id
                              })
                            })

                            if (response.ok) {
                              toast({
                                title: 'Reminder Sent',
                                description: `League fee reminder sent for ${fee.season.name}`,
                              })
                              fetchLeagueFees() // Refresh data
                            } else {
                              throw new Error('Failed to send reminder')
                            }
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to send league fee reminder',
                              variant: 'destructive'
                            })
                          }
                        }}
                        className="flex-1"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                      {fee.paymentMethod === 'online' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/league-fees/payment-link?feeId=${fee._id}&parentId=${payment?.parent?._id || payment?.parent?.id}`)

                              if (response.ok) {
                                const data = await response.json()
                                if (data.success && data.data.paymentLink) {
                                  window.open(data.data.paymentLink, '_blank')
                                  toast({
                                    title: 'Payment Link Created',
                                    description: 'Payment link opened in new tab',
                                  })
                                } else {
                                  throw new Error(data.error || 'Failed to create payment link')
                                }
                              } else {
                                throw new Error('Failed to create payment link')
                              }
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to create payment link',
                                variant: 'destructive'
                              })
                            }
                          }}
                          className="flex-1"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay Online
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No league fees found</p>
                <p className="text-xs mt-1">League fees will appear here when seasons are created</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}