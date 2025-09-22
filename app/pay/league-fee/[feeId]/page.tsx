'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { useToast } from '../../../../hooks/use-toast'
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  User, 
  CheckCircle, 
  ExternalLink,
  Loader2,
  Building2
} from 'lucide-react'
import Link from 'next/link'

interface LeagueFee {
  _id: string
  parentId: string
  seasonId: string
  amount: number
  processingFee: number
  totalAmount: number
  paymentMethod: string
  status: string
  dueDate: number
  remindersSent: number
  createdAt: number
  updatedAt: number
  season: {
    _id: string
    name: string
    type: string
    year: number
  }
  parent: {
    _id: string
    name: string
    email: string
  }
}

export default function LeagueFeePaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [fee, setFee] = useState<LeagueFee | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  
  const feeId = params.feeId as string
  const parentId = searchParams.get('parent')
  const amount = searchParams.get('amount')

  useEffect(() => {
    if (feeId && parentId) {
      fetchFeeDetails()
    }
  }, [feeId, parentId])

  const fetchFeeDetails = async () => {
    try {
      const response = await fetch(`/api/league-fees/facility-payment?feeId=${feeId}&parentId=${parentId}`)
      const data = await response.json()
      
      if (data.success) {
        setFee(data.data)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load payment details',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payment details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStripePayment = async () => {
    if (!fee || !parentId) return

    try {
      setPaymentLoading(true)

      // Get the actual Stripe payment link
      const response = await fetch(`/api/league-fees/payment-link?feeId=${feeId}&parentId=${parentId}`)
      const data = await response.json()

      if (data.success && data.data.paymentLink) {
        // Redirect to the Stripe payment link
        window.location.href = data.data.paymentLink
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create payment link',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create payment link',
        variant: 'destructive',
      })
    } finally {
      setPaymentLoading(false)
    }
  }

  const facilityPaymentLink = `/pay/facility/${feeId}?parent=${parentId}`

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (!fee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
            <p className="text-muted-foreground">
              The payment link you clicked is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (fee.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Already Paid
            </h2>
            <p className="text-muted-foreground">
              This league fee has already been paid.
            </p>
            <Badge variant="default" className="bg-green-100 text-green-800 mt-4">
              {fee.paymentMethod === 'facility' ? 'Paid at Facility' : 'Paid Online'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rise as One Basketball
          </h1>
          <p className="text-muted-foreground">
            "A program built by hard working kids and realistic parents"
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              League Fee Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{fee.parent.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">${fee.totalAmount}</span>
                    <span className="text-xs text-muted-foreground">
                      ${fee.amount} + ${fee.processingFee} processing fee
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Season Details</h4>
              <p className="text-muted-foreground">
                {fee.season.name} • {fee.season.year}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Payment Options
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Choose your preferred payment method below:
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={handleStripePayment}
                    disabled={paymentLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Payment Link...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Online with Credit Card (${fee.totalAmount})
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    or
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    size="lg"
                  >
                    <Link href={facilityPaymentLink}>
                      <Building2 className="h-4 w-4 mr-2" />
                      Pay at Facility (${fee.amount} - No Processing Fee)
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Online payments are processed securely through Stripe</p>
                <p>• Facility payments can be made in person with cash or check</p>
                <p>• All payments help support our basketball program</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about your payment? Contact Kevin Houston at{' '}
            <a href="mailto:khouston721@gmail.com" className="text-blue-600 hover:underline">
              khouston721@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
