'use client'

// Force dynamic rendering - prevent static generation
// Cache bust: 1753715500000
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Label } from '../../../components/ui/label'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Save,
  Users,
  Plus,
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  Badge
} from 'lucide-react'
import Link from 'next/link'
import { Parent } from '../../../lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Elements, PaymentElement, ElementsConsumer } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

// Payment options configuration
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
    id: "manual_card",
    name: "Manual Credit Card / Debit",
    description: "Record a card payment manually (no Stripe charge)",
    icon: CreditCard,
    recommended: false,
    processingFee: "None"
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
    description: "Pay the full amount now",
    installments: 1,
    installmentAmount: 1699.59
  },
  {
    value: "quarterly",
    label: "Quarterly",
    amount: "$566.74",
    description: "3 payments over 9 months (Total: $1,700.22)",
    installments: 3,
    installmentAmount: 566.74
  },
  {
    value: "monthly",
    label: "Monthly",
    amount: "$189.11",
    description: "9 payments over 9 months (Total: $1,701.99)",
    installments: 9,
    installmentAmount: 189.11
  },
  {
    value: "custom",
    label: "Custom Schedule",
    amount: "Variable",
    description: "Set your own installments",
    installments: 1,
    installmentAmount: 0
  },
]

export default function NewPaymentPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(false)

  // Enhanced Payment Options Dialog State
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [selectedPaymentOption, setSelectedPaymentOption] = useState('stripe_card')
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] = useState('monthly')
  const [customInstallments, setCustomInstallments] = useState(3)
  // Stripe Payment Element state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripePk, setStripePk] = useState<string | null>(null)
  const stripePromise = useMemo(() => (stripePk ? loadStripe(stripePk) : null), [stripePk])

  const [customMonths, setCustomMonths] = useState(9)
  const [paymentReference, setPaymentReference] = useState('')

  // State for check payments
  const [checkInstallments, setCheckInstallments] = useState<number>(1)
  const [checkFrequencyMonths, setCheckFrequencyMonths] = useState<number>(1)
  const [individualCheckNumbers, setIndividualCheckNumbers] = useState<string[]>([''])
  const [checkDetails, setCheckDetails] = useState({
    checkNumbers: [] as string[],
    startDate: '',
    customAmount: '',
  })
  const [cashInstallments, setCashInstallments] = useState<number>(1)
  const [cashFrequencyMonths, setCashFrequencyMonths] = useState<number>(1)
  const [cashDetails, setCashDetails] = useState({
    customAmount: '',
  })

  // Credit card form states
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

  const [formData, setFormData] = useState({
    parentId: '',
    type: 'monthly',
    totalAmount: '1701.99',
    installmentAmount: '189.11',
    installments: '9',
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'stripe_card',
    // Multi-year support
    season: `${new Date().getFullYear()} Season`,
    year: new Date().getFullYear()
  })

  // Force no cache and dynamic content
  useEffect(() => {
    // Set headers to prevent caching
    if (typeof window !== 'undefined') {
      const meta = document.createElement('meta')
      meta.httpEquiv = 'Cache-Control'
      meta.content = 'no-cache, no-store, must-revalidate'
      document.head.appendChild(meta)

      const meta2 = document.createElement('meta')
      meta2.httpEquiv = 'Pragma'
      meta2.content = 'no-cache'
      document.head.appendChild(meta2)

      const meta3 = document.createElement('meta')
      meta3.httpEquiv = 'Expires'
      meta3.content = '0'
      document.head.appendChild(meta3)
    }
  }, [])

  // Debug log to check if component is rendering
  console.log('🔍 NewPaymentPlanPage rendering, showPaymentOptions:', showPaymentOptions)

  useEffect(() => {
    fetchParents()
  }, [])

  useEffect(() => {
    const newCheckNumbers = Array(checkInstallments).fill('').map((_, index) =>
      individualCheckNumbers[index] || ''
    );
    setIndividualCheckNumbers(newCheckNumbers);
  }, [checkInstallments]);

  useEffect(() => {
    if (selectedPaymentOption === "cash") {
      setSelectedPaymentSchedule("custom");
    }
  }, [selectedPaymentOption]);

  const fetchParents = async () => {
    try {
      console.log('🔄 Fetching parents with API key authentication...')
      const response = await fetch('/api/parents?limit=1000', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      console.log('📡 Parents API response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        const parentsData = data.data?.parents || data.parents || []
        setParents(parentsData)
        console.log('📋 Fetched parents for payment plan:', parentsData.length)
      } else {
        console.error('Failed to fetch parents:', response.status)
        toast({
          title: "⚠️ Warning",
          description: "Failed to load parents list",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching parents:', error)
      toast({
        title: "❌ Error",
        description: "Error loading parents. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Form submitted with data:', formData)

    // Validate required fields
    if (!formData.parentId || !formData.totalAmount || !formData.installmentAmount) {
      toast({
        title: "❌ Missing Information",
        description: "Please fill in all required fields: Parent, Total Amount, and Installment Amount.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const requestBody = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
        installmentAmount: parseFloat(formData.installmentAmount),
        installments: parseInt(formData.installments)
      }

      console.log('🚀 Sending API request with body:', requestBody)
      console.log('🔑 Using API key: ra1-dashboard-api-key-2024')

      // Special case: one-time credit card payment should not create a plan
      if ((requestBody.type === 'full' || requestBody.type === 'one_time') && requestBody.paymentMethod === 'stripe_card') {
        try {
          // Create a standalone payment, then redirect to its detail for card processing
          const createPaymentRes = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: requestBody.parentId,
              amount: requestBody.totalAmount,
              dueDate: new Date().toISOString(),
              notes: 'Created from Full Payment (Card) on New Payment Plan form'
            })
          })
          if (!createPaymentRes.ok) {
            const err = await createPaymentRes.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to create payment record')
          }
          const created = await createPaymentRes.json()
          const paymentId = created?.data?._id || created?._id || created?.id
          if (!paymentId) throw new Error('Payment ID missing after creation')

          toast({
            title: 'Proceed to Card Payment',
            description: 'Redirecting to process the one-time card payment...',
          })

          // Redirect to payment detail; user can click "Choose payment option" to complete
          router.push(`/payments/${paymentId}`)
          return
        } catch (cardErr: any) {
          console.error('❌ One-time card payment setup failed:', cardErr)
          toast({
            title: '❌ Creation Failed',
            description: cardErr?.message || 'Failed to initialize one-time card payment',
            variant: 'destructive',
          })
          return
        } finally {
          setLoading(false)
        }
      }

      const response = await fetch('/api/payment-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Payment plan created:', result)

        // Show success toast
        toast({
          title: "✅ Payment Plan Created Successfully!",
          description: `Payment plan created for ${parents.find(p => p._id === formData.parentId)?.name || 'selected parent'}. First payment automatically processed.`,
          variant: "default",
          duration: 3000,
        })

        // Get the payment ID for redirect
        const paymentId = result.paymentIds?.[0] || result.mainPaymentId

        if (paymentId) {
          console.log(`Redirecting to payment detail page: /payments/${paymentId}`)

          // Redirect to the parent's profile page with a refresh indicator
          setTimeout(() => {
            router.push(`/parents/${formData.parentId}?planCreated=true`);
          }, 1500);
        } else {
          console.log('⚠️ No payment ID found in result, redirecting to parent profile page');
          toast({
            title: "⚠️ Payment Plan Created",
            description: "Payment plan created successfully. Redirecting to parent profile.",
            variant: "default",
          });

          setTimeout(() => {
            router.push(`/parents/${formData.parentId}?planCreated=true`);
          }, 2000);
        }

      } else {
        const error = await response.json()
        console.error('❌ API Error:', error)
        toast({
          title: "❌ Creation Failed",
          description: error.error || 'Failed to create payment plan',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error creating payment plan:', error)
      toast({
        title: "❌ Error",
        description: 'Error creating payment plan. Please try again.',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Handle plan type changes with predefined amounts
    if (field === 'type') {
      if (value === 'pay-in-full') {
        setFormData(prev => ({
          ...prev,
          type: value,
          totalAmount: '1650',
          installments: '1',
          installmentAmount: '1650'
        }))
      } else if (value === 'quarterly') {
        setFormData(prev => ({
          ...prev,
          type: value,
          totalAmount: '1650',
          installments: '3',
          installmentAmount: '550'
        }))
      } else if (value === 'monthly') {
        setFormData(prev => ({
          ...prev,
          type: value,
          totalAmount: '1701.99',
          installments: '9',
          installmentAmount: '189.11'
        }))
      } else if (value === 'custom') {
        setFormData(prev => ({
          ...prev,
          type: value,
          totalAmount: '',
          installments: '',
          installmentAmount: ''
        }))
      }
    }
  }

  // Handle schedule selection from payment options dialog
  const handleScheduleChange = (scheduleValue: string) => {
    setSelectedPaymentSchedule(scheduleValue)
    const schedule = paymentSchedules.find(s => s.value === scheduleValue)

    if (schedule) {
      if (scheduleValue === 'custom') {
        // For custom, calculate based on user inputs
        const totalAmount = 1650
        const installmentAmount = totalAmount / customInstallments
        setFormData(prev => ({
          ...prev,
          type: 'custom',
          totalAmount: totalAmount.toString(),
          installments: customInstallments.toString(),
          installmentAmount: installmentAmount.toFixed(2)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          type: scheduleValue === 'full' ? 'pay-in-full' : scheduleValue,
          totalAmount: (schedule.installmentAmount * schedule.installments).toString(),
          installments: schedule.installments.toString(),
          installmentAmount: schedule.installmentAmount.toString()
        }))
      }
    }
  }

  // Handle custom installment changes
  const handleCustomInstallmentChange = (installments: number) => {
    setCustomInstallments(installments)
    if (selectedPaymentSchedule === 'custom') {
      const totalAmount = 1650
      const installmentAmount = totalAmount / installments
      setFormData(prev => ({
        ...prev,
        installments: installments.toString(),
        installmentAmount: installmentAmount.toFixed(2)
      }))
    }
  }

  // Detect Stripe redirect success and show a toast
  useEffect(() => {
    try {
      const usp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const status = usp.get('status')
      const sessionId = usp.get('session_id')
      if (status === 'success' && sessionId) {
        toast({ title: '✅ Payment Completed', description: 'Stripe checkout completed successfully.' })
      }
    } catch {}
  }, [])

  // Prepare a PaymentIntent for Stripe when method + schedule are selected
  useEffect(() => {
    const run = async () => {
      try {
        if (!showPaymentOptions) return
        if (!(selectedPaymentOption === 'stripe_card' || selectedPaymentOption === 'stripe_ach')) return
        if (!selectedPaymentSchedule) return
        if (!formData.parentId) return
        if (stripeClientSecret) return

        const baseAmount = Number(formData.totalAmount) || 1650
        let paymentAmount = baseAmount
        switch (selectedPaymentSchedule) {
          case 'full':
          case 'pay-in-full':
            paymentAmount = baseAmount
            break
          case 'quarterly':
            paymentAmount = Number(formData.installmentAmount) || 566.74
            break
          case 'monthly':
            paymentAmount = Number(formData.installmentAmount) || 189.11
            break
          case 'custom':
            paymentAmount = Number(formData.installmentAmount) || (baseAmount / (customInstallments || 1))
            break
        }

        const resp = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: formData.parentId,
            amount: Math.round(paymentAmount * 100),
            description: 'Payment plan initial payment',
            cardOnly: false,
          }),
        })
        if (!resp.ok) return
        const { clientSecret } = await resp.json()
        if (clientSecret) setStripeClientSecret(clientSecret)
        try {
          const cfgRes = await fetch('/api/stripe/config')
          const cfg = await cfgRes.json().catch(() => ({}))
          if (cfg?.publishableKey) setStripePk(cfg.publishableKey)
        } catch {}
      } catch {}
    }
    run()
  }, [showPaymentOptions, selectedPaymentOption, selectedPaymentSchedule, formData.parentId, formData.totalAmount, formData.installmentAmount, customInstallments, stripeClientSecret])

  // Reset Stripe client secret when dialog closes
  useEffect(() => {
    if (!showPaymentOptions) setStripeClientSecret(null)
  }, [showPaymentOptions])

  // Apply payment options from dialog - CREATE PAYMENT PLAN AND REDIRECT TO CHECKOUT
  const handleApplyPaymentOptions = async () => {
    setLoading(true);
    setShowPaymentOptions(false);

    let paymentData: any = {
      parentId: formData.parentId,
      startDate: new Date().toISOString().split('T')[0],
      paymentMethod: selectedPaymentOption,
      type: selectedPaymentSchedule,
    };

    if (selectedPaymentOption === 'check') {
      const totalAmount = parseFloat(checkDetails.customAmount || '0') * checkInstallments;
      paymentData = {
        ...paymentData,
        totalAmount: totalAmount,
        installmentAmount: parseFloat(checkDetails.customAmount || '0'),
        installments: checkInstallments,
        description: `Check payment plan - ${checkInstallments} installments`,
        checkNumbers: individualCheckNumbers,
        frequency: checkFrequencyMonths,
      };
    } else if (selectedPaymentOption === 'cash') {
      const totalAmount = parseFloat(cashDetails.customAmount || '0') * cashInstallments;
      paymentData = {
        ...paymentData,
        totalAmount: totalAmount,
        installmentAmount: parseFloat(cashDetails.customAmount || '0'),
        installments: cashInstallments,
        description: `Cash payment plan - ${cashInstallments} installments`,
        frequency: cashFrequencyMonths,
      };
    } else {
      if (selectedPaymentSchedule === 'custom') {
        // Use the user-entered custom values already reflected in formData
        const installments = Number(formData.installments || customInstallments)
        const installmentAmount = Number(formData.installmentAmount || (1650 / installments))
        const totalAmount = Number(formData.totalAmount || (installmentAmount * installments))

        paymentData = {
          ...paymentData,
          totalAmount,
          installmentAmount,
          installments,
          description: `Payment plan - Custom (${installments} installments)`,
        }
      } else {
        const selectedScheduleDetails = paymentSchedules.find(s => s.value === selectedPaymentSchedule)
        const installmentAmount = Number(selectedScheduleDetails?.installmentAmount || 0)
        const installments = Number(selectedScheduleDetails?.installments || 1)
        const totalAmount = installmentAmount * installments

        paymentData = {
          ...paymentData,
          totalAmount,
          installmentAmount,
          installments,
          description: `Payment plan - ${selectedScheduleDetails?.label}`,
        }
      }
    }

    try {
      // 1:1 behavior with payment detail page for full + card: process payment FIRST, then plan (non-blocking)
      if (selectedPaymentOption === 'stripe_card' && selectedPaymentSchedule === 'full') {
        const totalAmountNum = Number(paymentData.totalAmount) || 0
        // Create a pending payment record (since new page has no existing payment)
        const createResp = await fetch('/api/payments/create-one-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: formData.parentId, amount: totalAmountNum, dueDate: Date.now() })
        })
        if (!createResp.ok) {
          const e = await createResp.json().catch(() => ({}))
          throw new Error(e.error || 'Failed to create payment record')
        }
        const { paymentId } = await createResp.json()

        // Create PaymentIntent and complete
        const intentResp = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: formData.parentId, paymentId, amount: Math.round(totalAmountNum * 100), description: 'One-time payment at plan creation' })
        })
        if (!intentResp.ok) {
          const errData = await intentResp.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to create PaymentIntent')
        }
        const { clientSecret } = await intentResp.json()
                const completeResp = await fetch(`/api/payments/${paymentId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentMethod: 'stripe_card', paymentPlan: 'full', sessionId: clientSecret, cardLast4: (creditCardForm.cardNumber || '').replace(/\s/g, '').slice(-4) })
        })
        if (!completeResp.ok) {
          const err = await completeResp.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to complete payment')
        }

        // Try to create the plan AFTER successful charge (non-blocking UX)
        ;(async () => {
          try {
            await fetch('/api/payment-plans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': 'ra1-dashboard-api-key-2024', 'x-request-id': Math.random().toString(36).slice(2) },
              body: JSON.stringify(paymentData)
            })
          } catch {}
        })()

        toast({ title: '✅ Payment Completed', description: `Charged $${totalAmountNum.toFixed(2)} successfully.` })
        router.push(`/parents/${formData.parentId}?planCreated=true`)
        return
      }

      // For all other schedules/methods: create the plan first, then branch as needed
      const response = await fetch('/api/payment-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024',
          'x-request-id': Math.random().toString(36).slice(2)
        },
        body: JSON.stringify(paymentData)
      })

      if (response.ok) {
        const result = await response.json()
        const paymentId = result.mainPaymentId || result.paymentIds?.[0]
        toast({ title: '✅ Payment Plan Created!', description: 'Payment plan has been set up successfully.', duration: 3000 })
        if (paymentId) router.push(`/parents/${formData.parentId}?planCreated=true`)
      } else {
        let error: any = {}
        try { error = await response.json() } catch (_) { try { const text = await response.text(); error = { error: text } } catch {} }
        toast({ title: '❌ Creation Failed', description: `${error.error || 'Failed to create payment plan'}${error.stage ? ` (stage: ${error.stage})` : ''}`, variant: 'destructive' })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: 'Error creating payment plan. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/payment-plans">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Payment Plan</h1>
            <p className="text-gray-600">Set up a new payment plan for a parent</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Payment Plan Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Parent Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="parentId">Select Parent *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href="/parents/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create a Parent
                    </Link>
                  </Button>
                </div>
                <select
                  id="parentId"
                  value={formData.parentId}
                  onChange={(e) => handleInputChange('parentId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a parent</option>
                  {parents.map((parent) => (
                    <option key={parent._id} value={parent._id}>
                      {parent.name} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Season/Year Selection */}
              <div className="space-y-2">
                <Label htmlFor="season">Season / Year *</Label>
                <p className="text-sm text-gray-500">
                  Select the enrollment period for this payment plan. Parents can have separate payment plans for different seasons.
                </p>
                <div className="flex gap-4">
                  <select
                    id="year"
                    value={formData.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value)
                      handleInputChange('year', year)
                      handleInputChange('season', `${year} Season`)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() + i - 1
                      return (
                        <option key={year} value={year}>
                          {year} Season
                        </option>
                      )
                    })}
                  </select>
                  <Input
                    id="season"
                    value={formData.season}
                    onChange={(e) => handleInputChange('season', e.target.value)}
                    placeholder="e.g., 2025 Spring Season"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Payment Options Button - Main Action */}
              <div className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Payment Options</h3>
                  <p className="text-gray-600 mb-6">Select payment method and schedule to create your payment plan</p>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!formData.parentId) {
                        toast({
                          title: "⚠️ Parent Required",
                          description: "Please select a parent first before choosing payment options.",
                          variant: "destructive",
                        })
                        return
                      }
                      setShowPaymentOptions(true)
                    }}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white text-lg"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Choose Payment Options
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Show selected options summary if options have been chosen */}
              {formData.paymentMethod && formData.type && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Selected Payment Options</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
                    <div>
                      <span className="font-medium">Payment Method:</span> {paymentOptions.find(p => p.id === formData.paymentMethod)?.name}
                    </div>
                    <div>
                      <span className="font-medium">Schedule:</span> {
                        formData.type === 'pay-in-full' ? 'Pay in Full' :
                        formData.type === 'quarterly' ? 'Quarterly' :
                        formData.type === 'monthly' ? 'Monthly' : 'Custom'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> ${formData.totalAmount}
                    </div>
                    <div>
                      <span className="font-medium">Per Payment:</span> ${formData.installmentAmount}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentOptions(true)}
                    className="mt-3"
                  >
                    Modify Options
                  </Button>
                </div>
              )}

              {/* Start Date - Only show if payment options are selected */}
              {formData.paymentMethod && formData.type && (
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Description - Only show if payment options are selected */}
              {formData.paymentMethod && formData.type && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Additional notes about this payment plan..."
                  />
                </div>
              )}

              {/* Submit Button - ALWAYS VISIBLE FOR TESTING */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/payment-plans">Cancel</Link>
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!formData.parentId) {
                      toast({
                        title: "⚠️ Parent Required",
                        description: "Please select a parent first.",
                        variant: "destructive",
                      })
                      return
                    }

                    setLoading(true)
                    try {
                      // Create payment plan with default monthly settings
                      const response = await fetch('/api/payment-plans', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-api-key': 'ra1-dashboard-api-key-2024'
                        },
                        body: JSON.stringify({
                          parentId: formData.parentId,
                          totalAmount: 1701.99,
                          installmentAmount: 189.11,
                          installments: 9,
                          startDate: new Date().toISOString().split('T')[0],
                          description: 'Monthly payment plan',
                          paymentMethod: 'stripe_card',
                          type: 'monthly',
                          season: formData.season,
                          year: formData.year
                        })
                      })

                      if (response.ok) {
                        const result = await response.json()

                        toast({
                          title: "✅ Payment Plan Created!",
                          description: "Redirecting to payment tracking...",
                          duration: 2000,
                        })

                        // REDIRECT TO PAYMENT DETAIL PAGE
                        const paymentId = result.mainPaymentId || result.paymentIds?.[0]
                        window.location.href = `/payments/${paymentId}`

                      } else {
                        const error = await response.json()
                        toast({
                          title: "❌ Creation Failed",
                          description: error.error || 'Failed to create payment plan',
                          variant: "destructive",
                        })
                      }
                    } catch (error) {
                      toast({
                        title: "❌ Error",
                        description: 'Error creating payment plan. Please try again.',
                        variant: "destructive",
                      })
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Payment Plan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Debug section for testing API */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  console.log('🧪 Testing API connection...')
                  fetch('/api/health')
                    .then(r => r.json())
                    .then(data => console.log('🏥 Health check:', data))
                    .catch(err => console.error('❌ Health check failed:', err))
                }}
              >
                🧪 Test API Connection
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  console.log('🔑 Testing authentication...')
                  fetch('/api/parents?limit=5', {
                    headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
                  })
                    .then(r => r.json())
                    .then(data => console.log('👨‍👩‍👧‍👦 Parents test:', data))
                    .catch(err => console.error('❌ Parents test failed:', err))
                }}
              >
                🔑 Test Authentication
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {formData.totalAmount && formData.installmentAmount && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Payment Plan Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Amount:</span> ${parseFloat(formData.totalAmount || '0').toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Per Payment:</span> ${parseFloat(formData.installmentAmount || '0').toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Number of Payments:</span> {formData.installments}
                </div>
                <div>
                  <span className="font-medium">Plan Type:</span> {formData.type}
                </div>
                <div>
                  <span className="font-medium">Payment Method:</span> {paymentOptions.find(p => p.id === formData.paymentMethod)?.name || 'Credit/Debit Card'}
                </div>
                <div>
                  <span className="font-medium">Processing Fee:</span> {paymentOptions.find(p => p.id === formData.paymentMethod)?.processingFee || '2.9% + $0.30'}
                </div>
              </div>

              {/* Payment Schedule Preview */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Payment Schedule</h4>
                <div className="text-sm text-blue-800">
                  {parseInt(formData.installments) === 1 ? (
                    <p>Single payment of ${parseFloat(formData.totalAmount).toLocaleString()} due on {new Date(formData.startDate).toLocaleDateString()}</p>
                  ) : (
                    <p>{formData.installments} payments of ${parseFloat(formData.installmentAmount).toLocaleString()} each, starting {new Date(formData.startDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Payment Options Dialog */}
      <Dialog open={showPaymentOptions} onOpenChange={setShowPaymentOptions}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl tracking-wide uppercase">
              <CreditCard className="h-6 w-6 text-orange-600" />
              Payment Options
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Choose your preferred payment method and schedule for this payment plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 uppercase tracking-wide">Select Payment Method</h3>
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
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Recommended
                        </span>
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
                        <span className={`text-xs px-3 py-1 rounded-full ${option.processingFee === "None" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {option.processingFee}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 uppercase tracking-wide">Payment Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSchedules.map((schedule) => (
                  <div
                    key={schedule.value}
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedPaymentSchedule === schedule.value
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => handleScheduleChange(schedule.value)}
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
                    <Select value={customInstallments.toString()} onValueChange={(value) => handleCustomInstallmentChange(parseInt(value))}>
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
                      Payment Amount: ${(1650 / customInstallments).toFixed(2)} per installment
                    </p>
                    <p className="text-blue-700">
                      {customInstallments} payments of ${(1650 / customInstallments).toFixed(2)} over {customMonths} months
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Method-specific fields */}
            {selectedPaymentOption === 'check' && (
              <div className="space-y-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Check Payment Details</h3>
                </div>

                {/* Installments and Payment Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Number of Installments</Label>
                    <Select value={String(checkInstallments)} onValueChange={(v) => setCheckInstallments(Number(v))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select installments" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(val => (
                          <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Payment Period (Months)</Label>
                    <Select value={String(checkFrequencyMonths)} onValueChange={(v) => setCheckFrequencyMonths(Number(v))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(val => (
                          <SelectItem key={val} value={String(val)}>{val} month(s)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Amount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Amount per Check</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="e.g., 189.11"
                      value={checkDetails.customAmount}
                      onChange={(e) => setCheckDetails(prev => ({ ...prev, customAmount: e.target.value }))}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                {/* Dynamic Check Numbers */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700">Check Numbers</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="bg-white"
                      />
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                {checkDetails.customAmount && (
                  <div className="p-4 bg-white border border-green-300 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold text-green-800">
                          ${(parseFloat(checkDetails.customAmount || '0') * checkInstallments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Per Payment:</span>
                        <span className="font-semibold text-green-800">
                          ${parseFloat(checkDetails.customAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Installments:</span>
                        <span className="font-semibold text-green-800">{checkInstallments}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cash Payment Fields */}
            {selectedPaymentOption === 'cash' && (
              <div className="space-y-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-900">Cash Payment Details</h3>
                </div>

                {/* Installments and Payment Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Number of Installments</Label>
                    <Select value={String(cashInstallments)} onValueChange={(v) => setCashInstallments(Number(v))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select installments" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(val => (
                          <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Payment Period (Months)</Label>
                    <Select value={String(cashFrequencyMonths)} onValueChange={(v) => setCashFrequencyMonths(Number(v))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(val => (
                          <SelectItem key={val} value={String(val)}>{val} month(s)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Amount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Amount per Payment</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="e.g., 183.33"
                      value={cashDetails.customAmount}
                      onChange={(e) => setCashDetails(prev => ({ ...prev, customAmount: e.target.value }))}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                {/* Dynamic Cash Payment Labels */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700">Cash Payments</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: cashInstallments }).map((_, index) => (
                      <div key={index} className="flex items-center p-3 bg-white border rounded-md">
                        <span className="text-sm">Cash Payment #{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                {cashDetails.customAmount && (
                  <div className="p-4 bg-white border border-yellow-300 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold text-yellow-800">
                          ${(parseFloat(cashDetails.customAmount || '0') * cashInstallments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Per Payment:</span>
                        <span className="font-semibold text-yellow-800">
                          ${parseFloat(cashDetails.customAmount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Installments:</span>
                        <span className="font-semibold text-yellow-800">{cashInstallments}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(selectedPaymentOption === 'cash') && (
              <div className="space-y-3">
                <Label htmlFor="paymentReference">
                  Receipt Number
                </Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={'Enter receipt number'}
                />
              </div>
            )}

            {/* Stripe Payment Element (secure) */}
            {(selectedPaymentOption?.startsWith('stripe_')) && stripeClientSecret && stripePk && (
              <Elements options={{ clientSecret: stripeClientSecret }} stripe={stripePromise as any}>
                <div className="space-y-4 bg-white p-4 rounded border">
                  <PaymentElement />
                </div>
              </Elements>
            )}
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentOptions(false)
                setStripeClientSecret(null)
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
                setSelectedPaymentOption('stripe_card')
                setSelectedPaymentSchedule('monthly')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            {selectedPaymentOption?.startsWith('stripe_') && stripeClientSecret && stripePk ? (
              <Elements options={{ clientSecret: stripeClientSecret }} stripe={stripePromise as any}>
                <ElementsConsumer>
                  {({ stripe, elements }) => (
                    <Button
                      onClick={async () => {
                        if (!stripe || !elements) return
                        try {
                          setLoading(true)
                          const result: any = await stripe.confirmPayment({
                            elements: elements!,
                            confirmParams: { return_url: window.location.href },
                            redirect: 'if_required',
                          })
                          if (result?.error) {
                            toast({ title: '❌ Payment Error', description: result.error.message || 'Payment failed', variant: 'destructive' })
                            return
                          }
                          toast({ title: '✅ Payment Submitted', description: 'Stripe payment submitted successfully.' })
                          setShowPaymentOptions(false)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      size="lg"
                    >
                      Process Payment
                    </Button>
                  )}
                </ElementsConsumer>
              </Elements>
            ) : (
              <Button
                onClick={handleApplyPaymentOptions}
                disabled={!selectedPaymentOption || !selectedPaymentSchedule}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                Apply Payment Options
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppLayout>
  )
}

// Component is already exported as default at line 104
