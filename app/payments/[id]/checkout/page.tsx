'use client'

// Force dynamic rendering - prevent static generation

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { CreditCard, Lock, CheckCircle, ArrowLeft } from 'lucide-react'

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  
  // Get payment details from URL params
  const amount = searchParams.get('amount') || '0'
  const parentName = searchParams.get('name') || ''
  const parentEmail = searchParams.get('email') || ''
  const parentId = searchParams.get('parentId') || ''
  const paymentPlan = searchParams.get('plan') || 'full'
  const installments = searchParams.get('installments') || '1'
  const paymentId = params.id

  // Form state
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: parentName,
    email: parentEmail,
    billingAddress: '',
    city: '',
    state: '',
    zipCode: ''
  })

  // Countdown timer for redirect after successful payment
  useEffect(() => {
    if (paymentSuccess && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (paymentSuccess && redirectCountdown === 0) {
      router.push(`/payments/${paymentId}?payment=success&plan=${paymentPlan}`)
    }
  }, [paymentSuccess, redirectCountdown, router, paymentId, paymentPlan])

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2, 4)
    }
    return digits
  }

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value)
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value)
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4)
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }))
  }

  const validateForm = () => {
    const { cardNumber, expiryDate, cvv, cardholderName, email } = formData
    
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      toast({ title: 'Invalid card number', variant: 'destructive' })
      return false
    }
    
    if (!expiryDate || expiryDate.length < 5) {
      toast({ title: 'Invalid expiry date', variant: 'destructive' })
      return false
    }
    
    if (!cvv || cvv.length < 3) {
      toast({ title: 'Invalid CVV', variant: 'destructive' })
      return false
    }
    
    if (!cardholderName.trim()) {
      toast({ title: 'Cardholder name is required', variant: 'destructive' })
      return false
    }
    
    if (!email.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      // For demo purposes, we'll accept any card number starting with 4 (Visa test cards)
      const cardNumber = formData.cardNumber.replace(/\s/g, '')
      
      if (!cardNumber.startsWith('4')) {
        throw new Error('Please use a test card number starting with 4 (e.g., 4242 4242 4242 4242)')
      }

      // Process payment based on plan type
      if (paymentPlan === 'full') {
        // Process one-time full payment
        await processOneTimePayment()
      } else {
        // Process subscription for monthly/quarterly payments
        await processSubscriptionPayment()
      }
      
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Payment processing failed',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const processOneTimePayment = async () => {
    // Use Stripe Checkout for one-time full payment
    const response = await fetch('/api/stripe/one-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId,
        paymentId,
        amount: Math.round(parseFloat(amount) * 100), // cents
        description: `One-time payment for ${parentName}`,
      })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create checkout session')
    }

    const { url } = await response.json()
    if (url) {
      window.location.href = url
      return
    }
    throw new Error('No checkout URL returned')
  }

  const processSubscriptionPayment = async () => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create subscription for recurring payments
    const response = await fetch(`/api/payments/${paymentId}/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPlan: paymentPlan,
        installments: parseInt(installments),
        paymentMethod: 'credit_card',
        cardLast4: formData.cardNumber.slice(-4),
        customerEmail: formData.email,
        customerName: formData.cardholderName
      })
    })

    if (response.ok) {
      const data = await response.json()
      setLoading(false)
      setPaymentSuccess(true)
      toast({
        title: 'Subscription Created!',
        description: `${paymentPlan === 'monthly' ? 'Monthly' : 'Quarterly'} payment plan activated. First payment of $${amount} processed.`,
      })
    } else {
      throw new Error('Failed to create subscription')
    }
  }

  const handleBackToPayment = () => {
    router.push(`/payments/${paymentId}`)
  }

  // Success confirmation screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Payment Successful!</CardTitle>
              <CardDescription>
                Your payment has been processed successfully
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Payment Confirmation Details */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-semibold text-green-800">${amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment For:</span>
                    <span className="font-medium">{parentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Plan:</span>
                    <span className="font-medium">
                      {paymentPlan === 'full' && 'Full Payment'}
                      {paymentPlan === 'monthly' && 'Monthly Plan'}
                      {paymentPlan === 'quarterly' && 'Quarterly Plan'}
                      {paymentPlan === 'custom' && 'Custom Plan'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card Used:</span>
                    <span className="font-medium">****{formData.cardNumber.slice(-4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Date:</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">What's Next?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {paymentPlan === 'full' ? (
                    <li>• Your payment is complete - no further action needed</li>
                  ) : (
                    <>
                      <li>• Your {paymentPlan} payment plan is now active</li>
                      <li>• Future payments will be processed automatically</li>
                      <li>• You'll receive email reminders before each payment</li>
                    </>
                  )}
                  <li>• A confirmation email has been sent to {formData.email}</li>
                  <li>• You can view payment details anytime in your account</li>
                </ul>
              </div>

              {/* Redirect Notice */}
              <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
                Redirecting to payment details in {redirectCountdown} seconds...
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleBackToPayment}
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  View Payment Details
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => router.push('/payments')}
                  className="w-full"
                >
                  Back to All Payments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Regular checkout form
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CreditCard className="h-5 w-5" />
              Secure Payment
            </CardTitle>
            <CardDescription>
              Complete your payment for RA1 Basketball Program
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Payment Summary */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Amount Due:</span>
                <span className="text-2xl font-bold text-blue-600">${amount}</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Paying for: {parentName}</div>
                <div>Email: {parentEmail}</div>
                <div className="font-medium text-blue-700">
                  {paymentPlan === 'full' && 'Full Payment'}
                  {paymentPlan === 'monthly' && `Monthly Plan (${installments} payments)`}
                  {paymentPlan === 'quarterly' && `Quarterly Plan (${installments} payments)`}
                  {paymentPlan === 'custom' && 'Custom Payment Plan'}
                </div>
                {paymentPlan !== 'full' && (
                  <div className="text-xs text-gray-500">
                    This is payment 1 of {installments}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card Number */}
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  maxLength={19}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use test card: 4242 4242 4242 4242
                </p>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={formData.expiryDate}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    maxLength={5}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    maxLength={4}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <Lock className="h-4 w-4" />
                <span>Your payment information is secure and encrypted</span>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  `Pay $${amount}`
                )}
              </Button>

              {/* Test Instructions */}
              <div className="text-xs text-center text-gray-500 mt-4 p-3 bg-yellow-50 rounded">
                <strong>Test Mode:</strong> Use card number 4242 4242 4242 4242 with any future date and any 3-digit CVV
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
