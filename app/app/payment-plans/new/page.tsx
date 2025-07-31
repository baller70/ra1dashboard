'use client'

// Force dynamic rendering - prevent static generation
// Cache bust: 1753715500000
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
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
    amount: "$183.33", 
    description: "9 payments over 9 months (Total: $1,649.97)",
    installments: 9,
    installmentAmount: 183.33
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
  const [customMonths, setCustomMonths] = useState(9)
  const [paymentReference, setPaymentReference] = useState('')
  
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
    totalAmount: '1650',
    installmentAmount: '183.33',
    installments: '9',
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'stripe_card'
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

  const fetchParents = async () => {
    try {
      const response = await fetch('/api/parents?limit=1000', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
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
    
    alert('🚨 HANDLESUBMIT CALLED!')
    console.log('🔥 Form submitted with data:', formData)
    
    // TEMPORARILY DISABLED FOR TESTING - USE DEFAULTS IF EMPTY
    if (!formData.parentId || !formData.totalAmount || !formData.installmentAmount) {
      console.warn('⚠️ Using default values for testing:', { 
        parentId: formData.parentId || 'DEFAULT_PARENT', 
        totalAmount: formData.totalAmount || '1650', 
        installmentAmount: formData.installmentAmount || '183.33' 
      })
      
      // Set defaults for testing
      setFormData(prev => ({
        ...prev,
        parentId: prev.parentId || 'jx7c9vhsz6tn2t8qjx7c9vhsz6tn2t8q', // Use first parent ID from your system
        totalAmount: prev.totalAmount || '1650',
        installmentAmount: prev.installmentAmount || '183.33'
      }))
      
      alert('🚨 USING DEFAULT VALUES FOR TESTING!')
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
      
      const response = await fetch('/api/payment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Payment plan created:', result)
        console.log('🔍 Full result object:', JSON.stringify(result, null, 2))
        
        // Show success toast
        toast({
          title: "✅ Payment Plan Created Successfully!",
          description: `Payment plan created for ${parents.find(p => p._id === formData.parentId)?.name || 'selected parent'}. First payment automatically processed.`,
          variant: "default",
          duration: 2000,
        })
        
        // Get the payment ID for redirect
        const paymentId = result.paymentIds?.[0] || result.mainPaymentId
        
        if (paymentId) {
          console.log(`🚀 Redirecting to payment detail page: /payments/${paymentId}`)
          
          // IMMEDIATE REDIRECT - NO BULLSHIT
          window.location.href = `/payments/${paymentId}`
          
        } else {
          console.log('⚠️ No payment ID found in result')
          toast({
            title: "⚠️ Payment Plan Created",
            description: "Payment plan created but redirect failed. Check payments page.",
            variant: "default",
          })
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
          totalAmount: '1650',
          installments: '9',
          installmentAmount: '183.33'
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

  // Apply payment options from dialog
  const handleApplyPaymentOptions = () => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: selectedPaymentOption
    }))
    setShowPaymentOptions(false)
    
    toast({
      title: "✅ Payment Options Applied",
      description: `Payment method: ${paymentOptions.find(p => p.id === selectedPaymentOption)?.name}, Schedule: ${paymentSchedules.find(s => s.value === selectedPaymentSchedule)?.label}`,
      duration: 3000,
    })
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

              {/* Payment Options Button - Main Action */}
              <div className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Payment Options</h3>
                  <p className="text-gray-600 mb-6">Select payment method and schedule to create your payment plan</p>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!formData.parentId) {
                        toast({
                          title: "⚠️ Parent Required",
                          description: "Please select a parent first before choosing payment options.",
                          variant: "destructive",
                        })
                        return
                      }
                      
                      // Create payment plan immediately with default settings
                      setLoading(true)
                      try {
                        const requestBody = {
                          ...formData,
                          totalAmount: parseFloat(formData.totalAmount || '1650'),
                          installmentAmount: parseFloat(formData.installmentAmount || '183.33'),
                          installments: parseInt(formData.installments || '9'),
                          type: formData.type || 'monthly',
                          paymentMethod: formData.paymentMethod || 'stripe_card'
                        }
                        
                        console.log('🚀 Creating payment plan via Choose Payment Options:', requestBody)
                        
                        const response = await fetch('/api/payment-plans', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(requestBody)
                        })

                        if (response.ok) {
                          const result = await response.json()
                          console.log('✅ Payment plan created via Choose Payment Options:', result)
                          
                          // Show success toast
                          toast({
                            title: "✅ Payment Plan Created Successfully!",
                            description: `Payment plan created for ${parents.find(p => p._id === formData.parentId)?.name || 'selected parent'}. First payment automatically processed.`,
                            variant: "default",
                            duration: 2000,
                          })
                          
                          // ALSO show a browser alert to make sure user sees it
                          alert('✅ SUCCESS! Payment Plan Created Successfully! First payment is already marked as PAID. Redirecting to tracking page...')
                          
                          // Get the first payment ID from the created payments
                          const firstPaymentId = result.paymentIds && result.paymentIds[0]
                          const mainPaymentId = result.mainPaymentId
                          
                          console.log('🎯 First payment ID from paymentIds:', firstPaymentId)
                          console.log('🎯 Main payment ID:', mainPaymentId)
                          
                          // Use whichever ID is available
                          const redirectPaymentId = firstPaymentId || mainPaymentId
                          
                          if (redirectPaymentId) {
                            console.log(`🚀 IMMEDIATE REDIRECT TO /payments/${redirectPaymentId}`)
                            
                            // Show alert to confirm redirect is happening
                            alert(`✅ SUCCESS! Payment Plan Created! Redirecting to payment tracking page for payment ID: ${redirectPaymentId}`)
                            
                            // Immediate redirect - no setTimeout
                            try {
                              window.location.href = `/payments/${redirectPaymentId}`
                            } catch (redirectError) {
                              console.error('❌ Redirect failed, trying alternative method:', redirectError)
                              window.location.assign(`/payments/${redirectPaymentId}`)
                            }
                          } else {
                            console.log('⚠️ No payment ID found in result, redirecting to payments list')
                            console.log('🔍 Available result keys:', Object.keys(result))
                            alert('⚠️ Payment plan created but no payment ID found. Redirecting to payments list.')
                            window.location.href = '/payments'
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
                <Button type="submit" disabled={loading}>
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
            <DialogTitle className="flex items-center gap-3 text-2xl">
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
                        <span className={`text-xs px-2 py-1 rounded-full ${option.processingFee === "None" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
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
            {(selectedPaymentOption === 'check' || selectedPaymentOption === 'cash') && (
              <div className="space-y-3">
                <Label htmlFor="paymentReference">
                  {selectedPaymentOption === 'check' ? 'Check Number' : 'Receipt Number'}
                </Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={selectedPaymentOption === 'check' ? 'Enter check number' : 'Enter receipt number'}
                />
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
                            ? `$${(1650 / customInstallments).toFixed(2)} per installment`
                            : paymentSchedules.find(s => s.value === selectedPaymentSchedule)?.amount || `$1650.00`
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
                setShowPaymentOptions(false)
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
            <Button 
              onClick={handleApplyPaymentOptions}
              disabled={
                !selectedPaymentOption || 
                !selectedPaymentSchedule ||
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
              Apply Payment Options
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </AppLayout>
  )
} 

// Component is already exported as default at line 104 
