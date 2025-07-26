'use client'

import { useState, useEffect } from 'react'
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
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { Parent } from '../../../lib/types'

export default function NewPaymentPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    parentId: '',
    type: 'pay-in-full',
    totalAmount: '1650',
    installmentAmount: '1650',
    installments: '1',
    startDate: new Date().toISOString().split('T')[0],
    description: ''
  })

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
    
    if (!formData.parentId || !formData.totalAmount || !formData.installmentAmount) {
      toast({
        title: "❌ Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/payment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalAmount: parseFloat(formData.totalAmount),
          installmentAmount: parseFloat(formData.installmentAmount),
          installments: parseInt(formData.installments)
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "✅ Payment Plan Created",
          description: `Successfully created payment plan for ${parents.find(p => p._id === formData.parentId)?.name || 'selected parent'}`,
          variant: "default",
        })
        
        // Wait a moment for the toast to show, then navigate
        setTimeout(() => {
          router.push('/payment-plans')
        }, 1000)
      } else {
        const error = await response.json()
        toast({
          title: "❌ Creation Failed",
          description: error.error || 'Failed to create payment plan',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating payment plan:', error)
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
    
    // Auto-calculate installment amount for custom type
    if (field === 'totalAmount' || field === 'installments') {
      if (formData.type === 'custom') {
        const total = parseFloat(field === 'totalAmount' ? value : formData.totalAmount)
        const installments = parseInt(field === 'installments' ? value : formData.installments)
        
        if (total && installments) {
          const installmentAmount = (total / installments).toFixed(2)
          setFormData(prev => ({ ...prev, installmentAmount }))
        }
      }
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
              Payment Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Parent Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="parentId">Parents *</Label>
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

              {/* Plan Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Plan Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="pay-in-full">Pay in Full $1650</option>
                  <option value="quarterly">Quarterly $550</option>
                  <option value="monthly">Monthly $183.33</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Plan Fields - Only show for custom type */}
              {formData.type === 'custom' && (
                <>
                  {/* Total Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.totalAmount}
                        onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                        className="pl-10"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Number of Installments */}
                  <div className="space-y-2">
                    <Label htmlFor="installments">Number of Installments *</Label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      value={formData.installments}
                      onChange={(e) => handleInputChange('installments', e.target.value)}
                      required
                    />
                  </div>

                  {/* Installment Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="installmentAmount">Installment Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="installmentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.installmentAmount}
                        onChange={(e) => handleInputChange('installmentAmount', e.target.value)}
                        className="pl-10"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Auto-calculated based on total amount and installments
                    </p>
                  </div>
                </>
              )}

              {/* Predefined Plan Summary - Show for non-custom types */}
              {formData.type !== 'custom' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Plan Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <span className="font-medium">Total Amount:</span> ${formData.totalAmount}
                    </div>
                    <div>
                      <span className="font-medium">Per Payment:</span> ${formData.installmentAmount}
                    </div>
                    <div>
                      <span className="font-medium">Number of Payments:</span> {formData.installments}
                    </div>
                    <div>
                      <span className="font-medium">Plan Type:</span> {
                        formData.type === 'pay-in-full' ? 'Pay in Full' :
                        formData.type === 'quarterly' ? 'Quarterly' :
                        formData.type === 'monthly' ? 'Monthly' : formData.type
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Start Date */}
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

              {/* Description */}
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

              {/* Submit Button */}
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
                      Create Plan
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
              <CardTitle>Payment Plan Preview</CardTitle>
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </AppLayout>
  )
} 