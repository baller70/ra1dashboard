'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { CheckCircle, DollarSign, Calendar, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../../components/ui/button'

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
  paidAt?: number
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

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [fee, setFee] = useState<LeagueFee | null>(null)
  const [loading, setLoading] = useState(true)
  
  const feeId = searchParams.get('fee')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (feeId) {
      fetchFeeDetails()
    }
  }, [feeId])

  const fetchFeeDetails = async () => {
    try {
      const response = await fetch(`/api/league-fees?feeId=${feeId}`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        const feeData = data.data.find((f: LeagueFee) => f._id === feeId)
        if (feeData) {
          setFee(feeData)
        }
      }
    } catch (error) {
      console.error('Error fetching fee details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment details...</p>
        </div>
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
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-green-800 mb-2">
                Thank You for Your Payment!
              </h2>
              <p className="text-muted-foreground mb-4">
                Your league fee payment has been processed successfully. 
                No more reminder emails will be sent.
              </p>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Payment Complete
              </Badge>
            </div>

            {fee && (
              <>
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Payment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{fee.parent.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Paid: {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : 'Today'}
                        </span>
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
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Season Details</h4>
                  <p className="text-muted-foreground">
                    {fee.season.name} • {fee.season.year}
                  </p>
                </div>
              </>
            )}

            {sessionId && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Transaction Details</h4>
                <p className="text-sm text-muted-foreground">
                  Session ID: {sessionId}
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                What's Next?
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• You will receive a receipt via email shortly</li>
                <li>• Your child is now registered for the season</li>
                <li>• Watch for updates about practice schedules and games</li>
                <li>• Contact us if you have any questions</li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Link>
              </Button>
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
