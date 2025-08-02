'use client'

import { useState, useEffect } from 'react'
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

interface Payment {
  id: string
  amount: number
  dueDate: string
  paidAt: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  remindersSent: number
  notes: string | null
  parent: {
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
      fileUrl: string // Added for contract details
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
        stripeSubscriptionId: string; // Added for cancellation
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

interface PaymentWithParent {
  id: string
  amount: number
  dueDate: string
  status: string
  paidAt: string | null
  parent: {
    id: string
    name: string
    email: string
    phone: string | null
    contractStatus?: string
    contractUrl?: string | null
    contractUploadedAt?: string | null
    contractExpiresAt?: string | null
    contracts?: {
      id: string
      fileName: string
      originalName: string
      fileUrl: string
      status: string
      uploadedAt: string
      signedAt: string | null
      expiresAt: string | null
      templateType: string | null
    }[]
    stripeCustomer?: {
      id: string
      stripeCustomerId: string
      email: string
      name: string
      phone: string | null
      defaultPaymentMethod: string | null
      currency: string | null
      balance: number | null
      delinquent: boolean
      subscriptions?: {
        id: string
        stripeSubscriptionId: string
        status: string
        currentPeriodStart: string
        currentPeriodEnd: string
        cancelAt: string | null
        canceledAt: string | null
        priceId: string
        quantity: number
        trialStart: string | null
        trialEnd: string | null
        metadata: any
      }[]
    }
  } | null
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

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [communicationHistory, setCommunicationHistory] = useState<CommunicationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [commHistoryLoading, setCommHistoryLoading] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStripe, setLoadingStripe] = useState(false);

  // Collapsible state
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false)
  const [isCommunicationHistoryOpen, setIsCommunicationHistoryOpen] = useState(true)

  useEffect(() => {
    fetchPaymentDetails()
    fetchPaymentHistory()
  }, [params.id])

  useEffect(() => {
    if (payment?.parent?.id) {
      fetchCommunicationHistory()
    }
  }, [payment?.parent?.id])

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payments/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Payment not found')
        } else {
          setError('Failed to load payment details')
        }
        return
      }

      const data = await response.json()
      setPayment(data)
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
      const response = await fetch(`/api/communication/history?parentId=${payment.parent.id}&limit=10`)
      
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
        // Refresh payment history after marking as paid
        fetchPaymentHistory()
        toast({
          title: 'Payment marked as paid!',
          description: `Payment ID: ${payment.id} has been marked as paid.`,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error marking as paid',
          description: errorData.message || 'Failed to mark payment as paid.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      toast({
        title: 'Error marking as paid',
        description: 'Failed to mark payment as paid due to an unexpected error.',
        variant: 'destructive',
      })
    }
  }

  const handleSendReminder = async () => {
    if (!payment || !payment.parent?.id) return
    
    try {
      setSendingReminder(true)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [payment.parent.id], // Send as array
          subject: 'Payment Reminder',
          body: `Dear ${payment.parent.name},\n\nThis is a friendly reminder that you have a payment of $${payment.amount} due on ${new Date(payment.dueDate).toLocaleDateString()}.\n\nPlease contact us if you have any questions.\n\nThank you!`,
          channel: 'email',
          variables: {
            parentName: payment.parent.name,
            amount: payment.amount,
            dueDate: new Date(payment.dueDate).toLocaleDateString(),
            paymentId: payment.id
          }
        })
      })

      if (response.ok) {
        // Refresh payment details and history after sending reminder
        fetchPaymentDetails()
        fetchPaymentHistory()
        
        // Show success toast
        toast({
          title: 'Reminder sent successfully',
          description: `Payment reminder sent to ${payment.parent.name}`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: 'Failed to send reminder',
        description: error instanceof Error ? error.message : 'There was an error sending the payment reminder.',
        variant: 'destructive',
      })
    } finally {
      setSendingReminder(false)
    }
  }

  const handleStripePortal = async () => {
    if (!payment?.parent?.id) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/portal?parentId=${payment.parent.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: 'Error opening Stripe Portal',
            description: data.message || 'Failed to open Stripe portal.',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open Stripe portal.');
      }
    } catch (error) {
      console.error('Error handling Stripe portal:', error);
      toast({
        title: 'Failed to open Stripe Portal',
        description: error instanceof Error ? error.message : 'There was an error opening the Stripe portal.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleStripeSync = async () => {
    if (!payment?.parent?.id) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/sync?parentId=${payment.parent.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Stripe Sync Successful',
            description: 'Stripe customer data synced successfully.',
          });
          fetchPaymentDetails(); // Refresh payment details to update balance
        } else {
          toast({
            title: 'Stripe Sync Failed',
            description: data.message || 'Failed to sync Stripe customer data.',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync Stripe customer data.');
      }
    } catch (error) {
      console.error('Error handling Stripe sync:', error);
      toast({
        title: 'Failed to Sync Stripe',
        description: error instanceof Error ? error.message : 'There was an error syncing the Stripe customer data.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleStripeSetup = async () => {
    if (!payment?.parent?.id) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/setup?parentId=${payment.parent.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: 'Error setting up Stripe',
            description: data.message || 'Failed to set up Stripe.',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set up Stripe.');
      }
    } catch (error) {
      console.error('Error handling Stripe setup:', error);
      toast({
        title: 'Failed to Setup Stripe',
        description: error instanceof Error ? error.message : 'There was an error setting up the Stripe integration.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleSubscriptionCreate = async () => {
    if (!payment?.parent?.id) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parentId: payment.parent.id,
          action: 'create'
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: 'Subscription Created',
            description: 'Subscription has been created successfully.',
          });
          // Refresh the page data
          window.location.reload();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription.');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Error creating subscription',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleSubscriptionManage = async () => {
    if (!payment?.parent?.id) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/portal?parentId=${payment.parent.id}&returnUrl=${encodeURIComponent(window.location.href)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        } else {
          toast({
            title: 'Error opening Stripe Portal',
            description: data.message || 'Failed to open Stripe portal.',
            variant: 'destructive',
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open Stripe portal.');
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: 'Error managing subscription',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleSubscriptionCancel = async () => {
    if (!payment?.parent?.stripeCustomer?.subscriptions?.[0]?.stripeSubscriptionId) return;
    setLoadingStripe(true);
    try {
      const response = await fetch(`/api/stripe/subscriptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriptionId: payment.parent.stripeCustomer.subscriptions[0].stripeSubscriptionId,
          action: 'cancel'
        })
      });
      if (response.ok) {
        toast({
          title: 'Subscription Canceled',
          description: 'Subscription will be canceled at the end of the current period.',
        });
        // Refresh the page data
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription.');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Error canceling subscription',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/payments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payments
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8" />
              Payment Details
              <Badge variant={getStatusVariant(payment.status)} className="text-sm">
                {getStatusIcon(payment.status)}
                <span className="ml-1 capitalize">{payment.status}</span>
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Payment ID: {payment.id}
            </p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline">
            <Link href="/communication">
              <MessageCircle className="mr-2 h-4 w-4" />
              Communication
            </Link>
          </Button>
          {payment.status === 'pending' && (
            <Button onClick={handleMarkAsPaid}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          {payment.status !== 'paid' && (
            <Button variant="outline" onClick={handleSendReminder} disabled={sendingReminder}>
              <Bell className="mr-2 h-4 w-4" />
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Payment Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-3xl font-bold text-green-600">
                    ${Number(payment.amount).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 font-medium">Amount Due</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-lg font-bold text-blue-600">
                    {new Date(payment.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">Due Date</p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${
                  payment.status === 'paid' 
                    ? 'bg-green-50 border-green-200' 
                    : payment.status === 'overdue'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {payment.status === 'paid' ? (
                    <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  ) : payment.status === 'overdue' ? (
                    <AlertTriangle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  ) : (
                    <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  )}
                  <p className={`text-lg font-bold capitalize ${
                    payment.status === 'paid' 
                      ? 'text-green-600' 
                      : payment.status === 'overdue'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {payment.status}
                  </p>
                  <p className={`text-sm font-medium ${
                    payment.status === 'paid' 
                      ? 'text-green-600' 
                      : payment.status === 'overdue'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    Payment Status
                  </p>
                </div>
              </div>
              
              {payment.paidAt && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Payment Completed</span>
                  </div>
                  <p className="text-green-700">
                    Paid on {new Date(payment.paidAt).toLocaleDateString()} at {new Date(payment.paidAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
              
              {payment.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Payment Notes</label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{payment.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Plan Information */}
          {payment.paymentPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payment Plan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plan Type</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize text-base px-3 py-1">
                        {payment.paymentPlan.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Plan Amount</label>
                    <p className="text-xl font-semibold mt-1">
                      ${Number(payment.paymentPlan.totalAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Installment Amount</label>
                  <p className="text-lg font-semibold mt-1">
                    ${Number(payment.paymentPlan.installmentAmount).toLocaleString()}
                  </p>
                </div>
                {payment.paymentPlan.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plan Description</label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded">
                      {payment.paymentPlan.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Collapsible open={isPaymentHistoryOpen} onOpenChange={setIsPaymentHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Payment History
                    </div>
                    {isPaymentHistoryOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Track of all payment-related activities and status changes
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  {paymentHistory.map((entry, index) => (
                    <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {entry.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.performedAt).toLocaleDateString()} at {new Date(entry.performedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            by {entry.performedBy}
                          </p>
                          {entry.amount && (
                            <Badge variant="outline" className="text-xs">
                              ${entry.amount.toLocaleString()}
                            </Badge>
                          )}
                          {entry.status && (
                            <Badge variant={getStatusVariant(entry.status)} className="text-xs">
                              {entry.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No History Available</h3>
                  <p className="text-muted-foreground">
                    Payment history will appear here as actions are performed
                  </p>
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Reminders History */}
          {payment.reminders && payment.reminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Reminder History
                </CardTitle>
                <CardDescription>
                  Communication history for this payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payment.reminders.map((reminder, index) => (
                    <div key={reminder.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-orange-600">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium capitalize">{reminder.reminderType}</p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled: {new Date(reminder.scheduledFor).toLocaleDateString()} at{' '}
                            {new Date(reminder.scheduledFor).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={reminder.status === 'sent' ? 'default' : 'secondary'}>
                        {reminder.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication History */}
          <Collapsible open={isCommunicationHistoryOpen} onOpenChange={setIsCommunicationHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Communication History
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
                    <span className="ml-2 text-sm text-muted-foreground">Loading communications...</span>
                  </div>
                ) : communicationHistory.length > 0 ? (
                  <div className="space-y-4">
                    {communicationHistory.slice(0, 5).map((comm, index) => (
                      <div key={comm.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
                            <span className="text-xs text-muted-foreground">
                              {new Date(comm.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium text-sm mb-2">
                          {comm.subject || 'No Subject'}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {comm.body}
                        </p>
                      </div>
                    ))}
                    
                    {communicationHistory.length > 5 && (
                      <div className="pt-4 border-t">
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/communication/history?parentId=${payment.parent?.id}`}>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            View More ({communicationHistory.length - 5} more messages)
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No Communications Yet</h4>
                    <p className="text-muted-foreground mb-4">
                      No messages have been sent to {payment.parent?.name} yet.
                    </p>
                    <Button asChild>
                      <Link href="/communication/send">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Send First Message
                      </Link>
                    </Button>
                  </div>
                )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
        </div>

        {/* Sidebar - Parent Information and Quick Actions */}
        <div className="space-y-6">
          {/* Parent Information - ALWAYS FIRST */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.parent ? (
                <>
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">
                        {payment.parent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{payment.parent.name}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm break-all">{payment.parent.email}</span>
                    </div>
                    {payment.parent.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{payment.parent.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button asChild className="w-full" size="sm">
                      <Link href={`/parents/${payment.parent.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Parent Profile
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No Parent Information</h4>
                  <p className="text-muted-foreground">
                    Parent information is not available for this payment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card - ALWAYS SECOND */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                  {/* Stripe Integration Section */}
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Stripe Integration
                      </h4>
                      {payment.parent?.stripeCustomer ? (
                        <Badge variant="default">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Connected</Badge>
                      )}
                    </div>
                    
                    {payment.parent?.stripeCustomer ? (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Customer ID: {payment.parent.stripeCustomer.stripeCustomerId}</p>
                          <p>Balance: ${(payment.parent.stripeCustomer.balance / 100).toFixed(2)}</p>
                          {payment.parent.stripeCustomer.delinquent && (
                            <p className="text-red-600">⚠ Account Delinquent</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={handleStripePortal}
                            disabled={loadingStripe}
                          >
                            <Settings className="mr-2 h-3 w-3" />
                            {loadingStripe ? 'Loading...' : 'Manage'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={handleStripeSync}
                            disabled={loadingStripe}
                          >
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Connect to Stripe for payment processing
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={handleStripeSetup}
                          disabled={loadingStripe}
                        >
                          <CreditCard className="mr-2 h-3 w-3" />
                          {loadingStripe ? 'Setting up...' : 'Setup Stripe'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Contract Section */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contract
                  </h4>
                  {payment.parent?.contracts && payment.parent.contracts.length > 0 ? (
                    <Badge variant={
                      payment.parent.contracts[0].status === 'signed' ? 'default' :
                      payment.parent.contracts[0].status === 'pending' ? 'secondary' :
                      payment.parent.contracts[0].status === 'expired' ? 'destructive' :
                      'outline'
                    }>
                      {payment.parent.contracts[0].status}
                    </Badge>
                  ) : payment.parent?.contractStatus ? (
                    <Badge variant={
                      payment.parent.contractStatus === 'signed' ? 'default' :
                      payment.parent.contractStatus === 'pending' ? 'secondary' :
                      payment.parent.contractStatus === 'expired' ? 'destructive' :
                      'outline'
                    }>
                      {payment.parent.contractStatus}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Uploaded</Badge>
                  )}
                </div>
                
                {payment.parent?.contracts && payment.parent.contracts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {payment.parent.contracts[0].originalName}
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/contracts/${payment.parent.contracts[0].id}`}>
                          <Eye className="mr-2 h-3 w-3" />
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <a href={payment.parent.contracts[0].fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : payment.parent?.contractStatus && payment.parent?.contractUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Legacy Contract ({payment.parent.contractStatus})
                    </p>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href="/contracts">
                          <Eye className="mr-2 h-3 w-3" />
                          View All
                        </Link>
                      </Button>
                      {payment.parent.contractUrl && (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <a href={payment.parent.contractUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No contract uploaded yet
                    </p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/contracts/upload?parentId=${payment.parent?.id}`}>
                        <Upload className="mr-2 h-3 w-3" />
                        Upload Contract
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Subscription Section */}
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Subscription
                      </h4>
                      {payment.parent?.stripeCustomer?.subscriptions && payment.parent.stripeCustomer.subscriptions.length > 0 ? (
                        <Badge variant={
                          payment.parent.stripeCustomer.subscriptions[0].status === 'active' ? 'default' :
                          payment.parent.stripeCustomer.subscriptions[0].status === 'trialing' ? 'secondary' :
                          payment.parent.stripeCustomer.subscriptions[0].status === 'canceled' ? 'destructive' :
                          'outline'
                        }>
                          {payment.parent.stripeCustomer.subscriptions[0].status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Subscription</Badge>
                      )}
                    </div>
                    
                    {payment.parent?.stripeCustomer?.subscriptions && payment.parent.stripeCustomer.subscriptions.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          <div>Current Period: {new Date(payment.parent.stripeCustomer.subscriptions[0].currentPeriodStart).toLocaleDateString()} - {new Date(payment.parent.stripeCustomer.subscriptions[0].currentPeriodEnd).toLocaleDateString()}</div>
                          {payment.parent.stripeCustomer.subscriptions[0].cancelAt && new Date(payment.parent.stripeCustomer.subscriptions[0].cancelAt) < new Date() && (
                            <div className="text-orange-600 font-medium">Cancels at: {new Date(payment.parent.stripeCustomer.subscriptions[0].cancelAt).toLocaleDateString()}</div>
                          )}
                          {payment.parent.stripeCustomer.subscriptions[0].trialEnd && new Date(payment.parent.stripeCustomer.subscriptions[0].trialEnd) > new Date() && (
                            <div className="text-blue-600 font-medium">Trial ends: {new Date(payment.parent.stripeCustomer.subscriptions[0].trialEnd).toLocaleDateString()}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={handleSubscriptionManage}
                            disabled={loadingStripe}
                          >
                            {loadingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
                            Manage
                          </Button>
                          {payment.parent.stripeCustomer.subscriptions[0].status === 'active' && payment.parent.stripeCustomer.subscriptions[0].cancelAt && new Date(payment.parent.stripeCustomer.subscriptions[0].cancelAt) > new Date() && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-orange-600"
                              onClick={handleSubscriptionCancel}
                              disabled={loadingStripe}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">No active subscription</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={handleSubscriptionCreate}
                          disabled={loadingStripe}
                        >
                          {loadingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Create Subscription
                        </Button>
                      </div>
                    )}
                  </div>

              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/communication">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Communication
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={handleSendReminder} 
                disabled={sendingReminder || payment.status === 'paid'}
              >
                <Bell className="mr-2 h-4 w-4" />
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </Button>

              {payment.status === 'pending' && (
                <Button onClick={handleMarkAsPaid} size="sm" className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 