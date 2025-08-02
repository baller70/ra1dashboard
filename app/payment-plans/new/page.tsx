'use client'

// Force dynamic rendering - prevent static generation
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
  Loader2,
  CreditCard,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

interface Parent {
  _id: string
  name: string
  email: string
  phone?: string
  status: string
}

export default function NewPaymentPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    parentId: '',
    totalAmount: '',
    type: 'monthly',
    installments: '1',
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    installmentAmount: ''
  })

  useEffect(() => {
    fetchParents()
  }, [])

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
        title: "Error",
        description: "Failed to load parents",
        variant: "destructive",
      })
    }
  }

  const calculateInstallmentAmount = (total: string, installments: string) => {
    const totalNum = parseFloat(total) || 0
    const installmentsNum = parseInt(installments) || 1
    return (totalNum / installmentsNum).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.parentId || !formData.totalAmount) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const requestBody = {
        parentId: formData.parentId,
        totalAmount: parseFloat(formData.totalAmount),
        type: formData.type,
        installments: parseInt(formData.installments),
        startDate: formData.startDate,
        description: formData.description || `${formData.type} payment plan`,
        installmentAmount: parseFloat(formData.installmentAmount),
      }
      
      console.log('🚀 Sending API request with body:', requestBody)
      console.log('🔑 Using API key: ra1-dashboard-api-key-2024')
      
      const response = await fetch('/api/payment-plans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Payment plan created:', result)
        
        toast({
          title: "✅ Success!",
          description: "Payment plan created successfully",
        })
        
        // Redirect to payment plan details
        if (result.paymentPlanId) {
          router.push(`/payment-plans/${result.paymentPlanId}`)
        } else {
          router.push('/payment-plans')
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Payment plan creation failed:', error)
        toast({
          title: "Error",
          description: error.error || 'Failed to create payment plan',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      toast({
        title: "Network Error",
        description: "Failed to create payment plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Create Payment Plan</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Parent Selection */}
              <div className="space-y-2">
                <Label htmlFor="parent">Select Parent *</Label>
                <Select value={formData.parentId} onValueChange={(value) => setFormData({...formData, parentId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent._id} value={parent._id}>
                        {parent.name} ({parent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Total Amount */}
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.totalAmount}
                  onChange={(e) => {
                    const newTotal = e.target.value
                    setFormData({
                      ...formData, 
                      totalAmount: newTotal,
                      installmentAmount: calculateInstallmentAmount(newTotal, formData.installments)
                    })
                  }}
                  required
                />
              </div>

              {/* Payment Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Payment Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Installments */}
              <div className="space-y-2">
                <Label htmlFor="installments">Number of Installments</Label>
                <Select 
                  value={formData.installments} 
                  onValueChange={(value) => {
                    setFormData({
                      ...formData, 
                      installments: value,
                      installmentAmount: calculateInstallmentAmount(formData.totalAmount, value)
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (One-time)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Installment Amount (calculated) */}
              <div className="space-y-2">
                <Label htmlFor="installmentAmount">Amount per Installment</Label>
                <Input
                  id="installmentAmount"
                  type="number"
                  step="0.01"
                  value={formData.installmentAmount}
                  onChange={(e) => setFormData({...formData, installmentAmount: e.target.value})}
                  placeholder="Calculated automatically"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Payment plan description..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Payment Plan Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Total Amount:</span> ${parseFloat(formData.totalAmount).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Number of Payments:</span> {formData.installments}
                </div>
                <div>
                  <span className="font-medium">Amount per Payment:</span> ${parseFloat(formData.installmentAmount).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Plan Type:</span> {formData.type}
                </div>
                <div>
                  <span className="font-medium">Start Date:</span> {new Date(formData.startDate).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Toaster />
    </AppLayout>
  )
}