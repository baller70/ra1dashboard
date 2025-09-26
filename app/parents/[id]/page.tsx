// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Separator } from '../../../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Save,
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
  Brain,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  Shield,
  Target,
  Send,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../../../hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'

interface ParentData {
  _id: string
  name: string
  email: string
  phone?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  status: string
  createdAt?: number
  updatedAt?: number
  notes?: string
  contractStatus?: string
  contractUploadedAt?: number
  contractExpiresAt?: number
}

interface PaymentData {
  id: string
  amount: number
  status: string
  dueDate: string
  paidAt?: string
  description: string
}



interface MessageData {
  id: string
  content: string
  channel: string
  sentAt: string
  status: string
}

export default function ParentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const parentId = params.id as string
  const { toast } = useToast()

  // Add debugging
  console.log('=== PARENT PROFILE PAGE DEBUG ===');
  console.log('parentId from params:', parentId);
  console.log('parentId type:', typeof parentId);
  console.log('parentId length:', parentId?.length);

  // Validate that we have a proper parent ID before making queries
  const isValidId = parentId && parentId !== 'undefined' && parentId.length > 20

  console.log('isValidId:', isValidId);

  // Use traditional fetch-based data loading instead of Convex queries
  const [parent, setParent] = useState<ParentData | null>(null)
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [paymentPlans, setPaymentPlans] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Fetch parent data
  useEffect(() => {
    const fetchParentData = async () => {
      if (!isValidId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('Fetching parent data for ID:', parentId)

        // Check if we are returning from a plan creation
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('planCreated')) {
          // Remove the query param to clean up the URL
          router.replace(`/parents/${parentId}`, undefined, { shallow: true });
          // The refresh will be triggered by the dependency array change,
          // but we can also explicitly call it.
          refreshParentData();
        }

        // Check if we're returning from an edit (look for updated parameter)
        const isUpdated = urlParams.get('updated')
        if (isUpdated) {
          console.log('Detected return from edit, forcing fresh data fetch')
          // Clear the URL parameter to clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname)
          // Trigger refresh of related data
          await refreshParentData()
        }

        // Add cache-busting timestamp to ensure fresh data
        const timestamp = Date.now()
        console.log('Using cache-busting timestamp:', timestamp)

        // Fetch parent details with cache-busting
        const parentResponse = await fetch(`/api/parents/${parentId}?t=${timestamp}`)
        if (parentResponse.ok) {
          const parentData = await parentResponse.json()
          console.log('Parent data received:', parentData)
          setParent(parentData)
        } else {
          console.error('Failed to fetch parent:', parentResponse.status)
          setDataError(`Failed to load parent data (${parentResponse.status})`)
        }

        // Fetch payments for this parent with cache-busting
        const paymentsResponse = await fetch(`/api/payments?parentId=${parentId}&limit=10&t=${timestamp}`)
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          console.log('Payments data received:', paymentsData)
          setPayments(paymentsData.data?.payments || [])
        } else {
          console.warn('Failed to fetch payments:', paymentsResponse.status)
        }

        // Fetch payment plans for this parent with cache-busting
        const plansResponse = await fetch(`/api/payment-plans?parentId=${parentId}&t=${timestamp}`)
        if (plansResponse.ok) {
          const plansData = await plansResponse.json()
          console.log('Payment plans data received:', plansData)
          const arr = Array.isArray(plansData) ? plansData : (Array.isArray(plansData?.data) ? plansData.data : [])
          setPaymentPlans(arr)
        } else {
          console.warn('Failed to fetch payment plans:', plansResponse.status)
        }



      } catch (error) {
        console.error('Error fetching parent data:', error)
        setDataError('Failed to load parent data')
      } finally {
        setLoading(false)
      }
    }

    fetchParentData()
  }, [parentId, isValidId])

  // Function to refresh parent data (can be called after payments are updated)
  const refreshParentData = async () => {
    if (!isValidId) return

    try {
      console.log('Refreshing parent data for ID:', parentId)

      // Refresh payments data
      const paymentsResponse = await fetch(`/api/payments?parentId=${parentId}&limit=10`)
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        console.log('Refreshed payments data:', paymentsData)
        setPayments(paymentsData.data?.payments || [])
      }

      // Refresh payment plans data
      const plansResponse = await fetch(`/api/payment-plans?parentId=${parentId}`)
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        console.log('Refreshed payment plans data:', plansData)
        const arr = Array.isArray(plansData) ? plansData : (Array.isArray(plansData?.data) ? plansData.data : [])
        setPaymentPlans(arr)
      }



      toast({
        title: 'Data refreshed',
        description: 'Payment information has been updated.',
      })

    } catch (error) {
      console.error('Error refreshing parent data:', error)
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh payment data.',
        variant: 'destructive',
      })
    }
  }

  // Make refreshParentData available globally for other components to call
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshParentData = refreshParentData
    }
  }, [parentId, isValidId])

  console.log('Current state:', { parent, payments, loading, dataError });
  console.log('=== END PARENT PROFILE DEBUG ===');

  const [editing, setEditing] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageInstructions, setMessageInstructions] = useState('')
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<ParentData>>({})
  const [showEditContact, setShowEditContact] = useState(false)
  const [showEditEmergency, setShowEditEmergency] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [savingEmergency, setSavingEmergency] = useState(false)
  const [contactForm, setContactForm] = useState({ email: '', phone: '', address: '' })
  const [emergencyForm, setEmergencyForm] = useState({ emergencyContact: '', emergencyPhone: '', parentEmail: '' })

  const openEditContact = () => {
    if (!parent) return
    setContactForm({
      email: parent.email || '',
      phone: parent.phone || '',
      address: parent.address || ''
    })
    setShowEditContact(true)
  }

  const openEditEmergency = () => {
    if (!parent) return
    setEmergencyForm({
      emergencyContact: parent.emergencyContact || '',
      emergencyPhone: parent.emergencyPhone || '',
      parentEmail: (parent as any).parentEmail || ''
    })
    setShowEditEmergency(true)
  }

  const saveContact = async () => {
    try {
      setSavingContact(true)
      const updates: any = {
        email: contactForm.email,
        phone: contactForm.phone || undefined,
        address: contactForm.address || undefined,
      }
      const res = await fetch(`/api/parents/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to save contact info')
      setParent((prev: any) => (prev ? { ...prev, ...updates } : prev))
      toast({ title: 'Saved', description: 'Contact information updated.' })
      setShowEditContact(false)
    } catch (e) {
      console.error(e)
      toast({ title: 'Save failed', description: 'Unable to update contact info.', variant: 'destructive' })
    } finally {
      setSavingContact(false)
    }
  }

  const saveEmergency = async () => {
    try {
      setSavingEmergency(true)
      const updates: any = {
        emergencyContact: emergencyForm.emergencyContact || undefined,
        emergencyPhone: emergencyForm.emergencyPhone || undefined,
        parentEmail: emergencyForm.parentEmail || undefined,
      }
      const res = await fetch(`/api/parents/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to save emergency contact')
      setParent((prev: any) => (prev ? { ...prev, ...updates } : prev))
      toast({ title: 'Saved', description: 'Emergency contact updated.' })
      setShowEditEmergency(false)
    } catch (e) {
      console.error(e)
      toast({ title: 'Save failed', description: 'Unable to update emergency contact.', variant: 'destructive' })
    } finally {
      setSavingEmergency(false)
    }
  }


  // Extract data from queries
  // const payments = paymentsData?.payments || []
  // const paymentPlans = paymentPlansData || []

  useEffect(() => {
    if (parent && !editing) {
      setFormData({
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        address: parent.address,
        emergencyContact: parent.emergencyContact,
        emergencyPhone: parent.emergencyPhone,
        status: parent.status,
        notes: parent.notes
      })
    }
  }, [parent, editing])

  const fetchAIAnalysis = async () => {
    // Only attempt analysis when we actually have a parent record
    if (!parentId || !parent) return

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/analyze-parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parentId })
      })

      if (response.ok) {
        const data = await response.json()
        // Extract analysis from the correct structure
        if (data.success && data.results && data.results.length > 0) {
          setAiAnalysis(data.results[0].analysis)
        } else {
          console.error('No analysis results found:', data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch AI analysis:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!messageContent.trim() || !parentId) return

    setSendingMessage(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentId,
          message: messageContent,
          type: 'manual'
        })
      })

      if (response.ok) {
        toast({
          title: 'Message sent',
          description: `Message sent to ${parent?.name}`,
        })
        setMessageContent('')
        setShowMessageDialog(false)
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: 'Error sending message',
        description: 'There was an error sending the message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const generateAIMessage = async () => {
    if (!parent) return
    setSendingMessage(true)
    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            parentId: parent._id,
            messageType: 'follow_up',
            tone: 'friendly',
          },
          customInstructions: messageInstructions || undefined,
          includePersonalization: true
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate message')
      const msg = data?.message
      if (msg) {
        setMessageContent(`${msg.body || msg.content || ''}`.trim())
      }
    } catch (error) {
      console.error('Failed to generate AI message:', error)
      toast({ title: 'AI generation failed', description: 'Please try again.' , variant: 'destructive'})
    } finally {
      setSendingMessage(false)
    }
  }

  // Recommendation action handlers
  const executeRecommendationAction = async (recommendation: string, actionType: string) => {
    setExecutingAction(recommendation)

    try {
      switch (actionType) {
        case 'send_reminder':
          await sendPaymentReminder()
          break
        case 'send_message':
          setMessageContent(`Hi ${parent?.name}, ${recommendation}`)
          setShowMessageDialog(true)
          break
        case 'create_payment_plan':
          await createPaymentPlan()
          break
        case 'schedule_followup':
          await scheduleFollowup(recommendation)
          break
        case 'update_risk_status':
          await updateRiskStatus()
          break
        default:
          toast({
            title: 'Action not implemented',
            description: 'This action is not yet available.',
            variant: 'destructive',
          })
      }
    } catch (error) {
      console.error('Failed to execute recommendation:', error)
      toast({
        title: 'Action failed',
        description: 'There was an error executing this action.',
        variant: 'destructive',
      })
    } finally {
      setExecutingAction(null)
    }
  }

  const sendPaymentReminder = async () => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId,
        message: `Hi ${parent?.name}, this is a friendly reminder about your upcoming payment. Please let us know if you need any assistance.`,
        type: 'payment_reminder'
      })
    })

    if (response.ok) {
      toast({
        title: 'Payment reminder sent',
        description: `Payment reminder sent to ${parent?.name}`,
      })
    } else {
      throw new Error('Failed to send payment reminder')
    }
  }

  const createPaymentPlan = async () => {
    // Navigate to payment plan creation
    window.open(`/parents/${parentId}/payment-plan/new`, '_blank')
    toast({
      title: 'Opening payment plan creator',
      description: 'Payment plan creation page opened in new tab',
    })
  }

  const scheduleFollowup = async (recommendation: string) => {
    const response = await fetch('/api/messages/scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId,
        message: `Follow-up: ${recommendation}`,
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        type: 'followup'
      })
    })

    if (response.ok) {
      toast({
        title: 'Follow-up scheduled',
        description: 'Follow-up message scheduled for next week',
      })
    } else {
      throw new Error('Failed to schedule follow-up')
    }
  }



  const updateRiskStatus = async () => {
    const response = await fetch(`/api/parents/${parentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'ra1-dashboard-api-key-2024'
      },
      body: JSON.stringify({
        riskLevel: aiAnalysis?.riskLevel,
        lastRiskAssessment: new Date()
      })
    })

    if (response.ok) {
      toast({
        title: 'Risk status updated',
        description: 'Parent risk status has been updated',
      })
    } else {
      throw new Error('Failed to update risk status')
    }
  }

  const getRecommendationActionType = (recommendation: string): string => {
    const lower = recommendation.toLowerCase()
    if (lower.includes('payment') && (lower.includes('remind') || lower.includes('overdue'))) {
      return 'send_reminder'
    } else if (lower.includes('payment plan') || lower.includes('installment')) {
      return 'create_payment_plan'
    } else if (lower.includes('follow up') || lower.includes('contact') || lower.includes('call')) {
      return 'schedule_followup'
    } else if (lower.includes('risk') || lower.includes('status')) {
      return 'update_risk_status'
    } else {
      return 'send_message'
    }
  }

  const getActionButtonText = (actionType: string): string => {
    switch (actionType) {
      case 'send_reminder': return 'Send Reminder'
      case 'send_message': return 'Send Message'
      case 'create_payment_plan': return 'Create Plan'
      case 'schedule_followup': return 'Schedule Follow-up'
      case 'update_risk_status': return 'Update Status'
      default: return 'Take Action'
    }
  }

  const getActionButtonIcon = (actionType: string) => {
    switch (actionType) {
      case 'send_reminder': return <Mail className="h-3 w-3" />
      case 'send_message': return <MessageSquare className="h-3 w-3" />
      case 'create_payment_plan': return <CreditCard className="h-3 w-3" />
      case 'schedule_followup': return <Calendar className="h-3 w-3" />
      case 'update_risk_status': return <Shield className="h-3 w-3" />
      default: return <Target className="h-3 w-3" />
    }
  }

  // Auto-fetch AI analysis when parent is loaded
  useEffect(() => {
    if (!loading && parent && !aiAnalysis) {
      fetchAIAnalysis();
    }
  }, [loading, parent]);

  // If parent was not found, stop loading state and set an error for UI
  useEffect(() => {
    if (!loading && !parent && !dataError) {
      setDataError('Parent not found in the database.')
    }
  }, [loading, parent, dataError])

  // Check for invalid ID first
  if (!isValidId) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Invalid Parent ID</h1>
          <p className="text-muted-foreground mb-4">The parent ID in the URL is not valid.</p>
          <Button asChild>
            <Link href="/parents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Parents
            </Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Helper functions for badge variants
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default' // Green
      case 'suspended':
        return 'destructive' // Red
      case 'pending':
        return 'secondary' // Gray
      case 'inactive':
        return 'outline' // Outline
      default:
        return 'secondary'
    }
  }

  const getContractStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'signed':
        return 'default' // Green
      case 'pending':
        return 'secondary' // Gray
      case 'expired':
        return 'destructive' // Red
      case 'draft':
        return 'outline' // Outline
      default:
        return 'secondary'
    }
  }

  // Show loading only when data is being fetched
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="animate-spin mr-2" /> Loading parent data...
        </div>
      </AppLayout>
    )
  }

  // Show a simple message when parent record is missing or other error occurred
  if (dataError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <AlertTriangle className="text-destructive w-10 h-10" />
          <p className="text-lg font-semibold">{dataError}</p>
          <Button variant="secondary" onClick={() => router.push('/parents')}>Back to Parents List</Button>
        </div>
      </AppLayout>
    )
  }

  const openPlanDetail = async (plan: any) => {
    try {
      const targetId = plan?.mainPaymentId || plan?.firstPaymentId
      if (targetId) {
        router.push(`/payments/${targetId}`)
        return
      }
      // Fallback: fetch payments for this parent and locate by paymentPlanId
      const res = await fetch(`/api/payments?parentId=${parentId}&limit=1000&_t=${Date.now()}`)
      const json = await res.json()
      const list = json?.data?.payments || []
      const match = list.find((p: any) => String(p.paymentPlanId || '') === String(plan._id || plan.id || ''))
      if (match?._id) {
        router.push(`/payments/${match._id}`)
      } else {
        toast({ title: 'Payment not found', description: 'No payment record found for this plan yet.' })
      }
    } catch (e) {
      toast({ title: 'Navigation failed', description: 'Unable to open payment detail.' })
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/parents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Parents
              </Link>
            </Button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {parent.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 text-xs">
                    <Brain className="mr-1 h-3 w-3" />
                    AI
                  </Badge>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{parent.name}</h1>
                <p className="text-muted-foreground">AI-Enhanced Parent Profile</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={getStatusVariant(parent.status || 'inactive')}>
                    {parent.status || 'inactive'}
                  </Badge>
                  <Badge variant={getContractStatusVariant((parent.contractStatus === 'Completed' ? 'signed' : parent.contractStatus) || 'draft')}>
                    Contract: {(parent.contractStatus === 'Completed' ? 'signed' : parent.contractStatus) || 'draft'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchAIAnalysis}
              disabled={aiLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
            >
              {aiLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              {aiLoading ? 'AI Analyzing...' : 'AI Analysis'}
            </Button>
            <Button variant="outline" onClick={() => { setShowMessageDialog(true); /* optional: clear previous */ setMessageContent(''); }} disabled={sendingMessage}>
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
              ) : (
                <MessageSquare className="mr-2 h-4 w-4" />
              )}
              {sendingMessage ? 'Generating...' : 'Send Message'}
            </Button>
            <Button asChild>
              <Link href={`/parents/${parent._id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Parent
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Information */}
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contact Information</CardTitle>
              <Button variant="outline" size="sm" onClick={openEditContact}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{parent.email}</p>
                </div>
              </div>
              {parent.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{parent.phone}</p>
                  </div>
                </div>
              )}
              {parent.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{parent.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Emergency Contact</CardTitle>
              <Button variant="outline" size="sm" onClick={openEditEmergency}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {parent.emergencyContact && (
                <div>
                  <p className="text-sm font-medium">Contact Person</p>
                  <p className="text-sm text-muted-foreground">{parent.emergencyContact}</p>
                </div>
              )}
              { (parent as any).parentEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Parent Email</p>
                    <p className="text-sm text-muted-foreground">{(parent as any).parentEmail}</p>
                  </div>
                </div>
              )}

              {parent.emergencyPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Emergency Phone</p>
                    <p className="text-sm text-muted-foreground">{parent.emergencyPhone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={getContractStatusVariant(parent.contractStatus || 'draft')}>
                    {parent.contractStatus || 'draft'}
                  </Badge>
                </div>
              </div>
              {parent.contractUploadedAt && (
                <div>
                  <p className="text-sm font-medium">Uploaded</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(parent.contractUploadedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {parent.contractExpiresAt && (
                <div>
                  <p className="text-sm font-medium">Expires</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(parent.contractExpiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Analysis Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Risk Assessment */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Brain className="mr-2 h-4 w-4 text-purple-600" />
                AI Risk Assessment
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAIAnalysis}
                disabled={aiLoading}
              >
                <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Risk Level</span>
                    </div>
                    <Badge
                      variant={
                        aiAnalysis.riskLevel === 'high' ? 'destructive' :
                        aiAnalysis.riskLevel === 'medium' ? 'secondary' : 'default'
                      }
                    >
                      {aiAnalysis.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Risk Score</span>
                      <span className="font-medium">{aiAnalysis.riskScore || 0}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (aiAnalysis.riskScore || 0) > 70 ? 'bg-red-500' :
                          (aiAnalysis.riskScore || 0) > 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(aiAnalysis.riskScore || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Prediction</span>
                      <span className="font-medium">{aiAnalysis.paymentPrediction || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Engagement Score</span>
                      <span className="font-medium">{aiAnalysis.engagementScore || 0}/100</span>
                    </div>
                  </div>

                  {aiAnalysis.keyInsights && aiAnalysis.keyInsights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center">
                        <TrendingUp className="mr-1 h-4 w-4" />
                        Key Insights
                      </h4>
                      {aiAnalysis.keyInsights.slice(0, 3).map((insight: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm">{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click refresh to generate AI analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Lightbulb className="mr-2 h-4 w-4 text-orange-600" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis?.recommendations ? (
                <div className="space-y-4">
                  {aiAnalysis.recommendations.slice(0, 4).map((recommendation: string, index: number) => {
                    const actionType = getRecommendationActionType(recommendation)
                    const isExecuting = executingAction === recommendation

                    return (
                      <div key={index} className="p-3 border border-orange-200 rounded-lg bg-white/50">
                        <div className="flex items-start justify-between space-x-3">
                          <div className="flex items-start space-x-3 flex-1">
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {index + 1}
                            </Badge>
                            <span className="text-sm flex-1">{recommendation}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isExecuting}
                            onClick={() => executeRecommendationAction(recommendation, actionType)}
                            className="ml-2 shrink-0 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-none"
                          >
                            {isExecuting ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                            ) : (
                              getActionButtonIcon(actionType)
                            )}
                            <span className="ml-1 text-xs">
                              {isExecuting ? 'Acting...' : getActionButtonText(actionType)}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {aiAnalysis.priorityActions && aiAnalysis.priorityActions.length > 0 && (
                    <div className="pt-3 border-t border-orange-200">
                      <h4 className="text-xs font-semibold text-red-600 mb-3 flex items-center">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Priority Actions
                      </h4>
                      {aiAnalysis.priorityActions.slice(0, 2).map((action: string, index: number) => {
                        const actionType = getRecommendationActionType(action)
                        const isExecuting = executingAction === action

                        return (
                          <div key={index} className="p-3 mb-2 border border-red-200 rounded-lg bg-red-50/50">
                            <div className="flex items-start justify-between space-x-3">
                              <div className="flex items-start space-x-2 flex-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-xs text-red-700 flex-1">{action}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isExecuting}
                                onClick={() => executeRecommendationAction(action, actionType)}
                                className="ml-2 shrink-0 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white border-none"
                              >
                                {isExecuting ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                                ) : (
                                  getActionButtonIcon(actionType)
                                )}
                                <span className="ml-1 text-xs">
                                  {isExecuting ? 'Acting...' : getActionButtonText(actionType)}
                                </span>
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    AI recommendations will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Plans {Array.isArray(paymentPlans) ? `(${paymentPlans.length})` : ''}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshParentData}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {Array.isArray(paymentPlans) && paymentPlans.length > 0 ? (
              <div className="space-y-3">
                {paymentPlans.map((plan) => (
                  <Link
                    key={String(plan._id || plan.id)}
                    href="#"
                    className="block"
                    onClick={(e) => { e.preventDefault(); openPlanDetail(plan) }}
                  >
                    <div className="p-4 border rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-colors cursor-pointer group" role="button">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium group-hover:text-orange-600 transition-colors">
                               {(plan as any).type || 'Installment'} Payment Plan
                            </p>
                            <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                           {plan.description && (
                             <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                           )}
                          <div className="flex items-center justify-between">
                            <div className="text-right">
                               <p className="font-semibold text-lg">${Number((plan as any).totalAmount || 0).toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                ${Number((plan as any).installmentAmount || 0).toLocaleString()} x {(plan as any).installments} installments
                              </p>
                            </div>
                             {(plan as any).status && (
                              <Badge variant={(plan as any).status === 'active' ? 'default' : (plan as any).status === 'completed' ? 'secondary' : 'outline'}>
                                {(plan as any).status}
                              </Badge>
                            )}
                          </div>
                           {(plan as any).nextDueDate && (
                            <p className="text-xs text-orange-600 mt-1">
                               Next payment due: {new Date((plan as any).nextDueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {paymentPlans.length > 3 && (
                  <div className="pt-3 border-t">
                    <Link href={`/payment-plans?parentId=${parentId}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View All Payment Plans ({paymentPlans.length})
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment plans found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Payments
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshParentData}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="p-3 border rounded bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              ${Number(payment.amount).toLocaleString()}
                            </p>
                            <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                          {payment.paidAt && (
                            <p className="text-xs text-green-600">
                              Paid: {new Date(payment.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment records found</p>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Notes */}
        {parent.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{parent.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Generated Message for {parent?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              This message was personalized based on {parent?.name}'s profile, payment history, and AI analysis.
              You can edit it before sending.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="instructions">Tell the AI what this message should cover</Label>
              <Input
                id="instructions"
                value={messageInstructions}
                onChange={(e) => setMessageInstructions(e.target.value)}
                placeholder="e.g. Ask about overdue payment and offer help, confirm practice schedule, etc."
              />
            </div>
            <Label htmlFor="message">Message Content</Label>
            <Textarea
              id="message"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="AI-generated message will appear here..."
              rows={6}
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={generateAIMessage}
                disabled={sendingMessage}
                size="sm"
              >
                <Brain className="mr-2 h-3 w-3" />
                Regenerate AI Message
              </Button>
              <Button onClick={sendMessage} disabled={sendingMessage || !messageContent.trim()}>
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Information Dialog */}
      <Dialog open={showEditContact} onOpenChange={setShowEditContact}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="editEmail">Email</Label>
              <Input id="editEmail" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editPhone">Phone</Label>
              <Input id="editPhone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editAddress">Address</Label>
              <Input id="editAddress" value={contactForm.address} onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditContact(false)}>Cancel</Button>
              <Button onClick={saveContact} disabled={savingContact}>
                {savingContact ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {savingContact ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Emergency Contact Dialog */}
      <Dialog open={showEditEmergency} onOpenChange={setShowEditEmergency}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="editEmergencyContact">Contact Person</Label>
              <Input id="editEmergencyContact" value={emergencyForm.emergencyContact} onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContact: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editParentEmail">Parent Email</Label>
              <Input id="editParentEmail" type="email" value={emergencyForm.parentEmail} onChange={(e) => setEmergencyForm({ ...emergencyForm, parentEmail: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="editEmergencyPhone">Emergency Phone</Label>
              <Input id="editEmergencyPhone" value={emergencyForm.emergencyPhone} onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyPhone: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditEmergency(false)}>Cancel</Button>
              <Button onClick={saveEmergency} disabled={savingEmergency}>
                {savingEmergency ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {savingEmergency ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  )
}
