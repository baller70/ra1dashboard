'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { useToast } from '../../../../hooks/use-toast'
import { CheckCircle, DollarSign, Calendar, User, Building2, Loader2 } from 'lucide-react'

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

export default function FacilityPaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [fee, setFee] = useState<LeagueFee | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  
  const feeId = params.feeId as string
  const parentId = searchParams.get('parent')

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
        if (data.data.status === 'paid') {
          setConfirmed(true)
        }
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

  const handleConfirmPayment = async () => {
    if (!fee || !parentId) return

    try {
      setConfirming(true)
      const response = await fetch('/api/league-fees/facility-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: fee._id,
          parentId: parentId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setConfirmed(true)
        setFee(data.data.fee)
        toast({
          title: 'Payment Confirmed!',
          description: 'Your league fee has been marked as paid. No more reminders will be sent.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to confirm payment',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to confirm payment',
        variant: 'destructive',
      })
    } finally {
      setConfirming(false)
    }
  }

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
              <Building2 className="h-5 w-5" />
              Facility Payment Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {confirmed ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-green-800 mb-2">
                  Payment Confirmed!
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your league fee has been marked as paid. No more reminder emails will be sent.
                </p>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Paid at Facility
                </Badge>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Facility Payment Option
                  </h3>
                  <p className="text-blue-800 text-sm">
                    Click the button below to confirm that you will pay (or have already paid) 
                    your league fee in person at the facility. This will stop all reminder emails.
                  </p>
                </div>

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
                      <span className="font-medium">${fee.amount}</span>
                      <span className="text-sm text-muted-foreground">
                        (No processing fee for facility payments)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Season Details</h4>
                  <p className="text-muted-foreground">
                    {fee.season.name} • {fee.season.year}
                  </p>
                </div>

                <Button
                  onClick={handleConfirmPayment}
                  disabled={confirming}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Facility Payment
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By clicking this button, you confirm that you will pay or have paid 
                  your league fee in person at the facility.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
