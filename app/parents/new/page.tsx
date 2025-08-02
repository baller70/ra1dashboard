'use client'

// Force dynamic rendering - prevent static generation
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'
import { ArrowLeft, Save, User } from 'lucide-react'
import Link from 'next/link'

export default function NewParentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (formData.phone && !/^[\+]?[(]?[\d\s\-\(\)]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submission started')
    console.log('Form data:', formData)
    
    // Reset states
    setErrors({})
    setLoading(true)
    
    // Validate form
    if (!validateForm()) {
      setLoading(false)
      toast({
        title: "❌ Validation Error", 
        description: "Please fix the errors below",
        variant: "destructive",
      })
      console.log('Form validation failed')
      return
    }
    
    try {
      console.log('Making API request to /api/parents')
      
      const response = await fetch('/api/parents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify(formData),
      })
      
      console.log('Response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })
      
      const result = await response.json()
      console.log('Response data:', result)
      
      if (response.ok && result.success) {
        toast({
          title: "✅ Parent Added Successfully",
          description: `${formData.name} has been added to the system`,
          variant: "default",
        })
        console.log('SUCCESS: Parent created with ID:', result.data._id)
        
        // Clear form
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          emergencyContact: '',
          emergencyPhone: '',
          notes: ''
        })
        
        // Redirect to parents list to see the new parent
        setTimeout(() => {
          console.log('Redirecting to parents list...')
          router.push('/parents')
        }, 1500)
        
      } else {
        const errorMsg = result.error || result.message || 'Failed to create parent'
        console.error('API Error Response:', {
          status: response.status,
          result: result,
          errorMsg: errorMsg
        })
        toast({
          title: "❌ Error Creating Parent",
          description: errorMsg,
          variant: "destructive",
        })
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred'
      toast({
        title: "❌ Network Error",
        description: errorMsg,
        variant: "destructive",
      })
      console.error('Network error:', error)
    } finally {
      setLoading(false)
      console.log('Form submission completed')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link href="/payment-plans/new">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Parent</h1>
          <p className="text-gray-600">Enter parent information below. All fields marked with * are required.</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Parent Information
          </CardTitle>
        </CardHeader>
        <CardContent>
        
          <form onSubmit={handleSubmit} className="space-y-6">
          
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter parent's full name"
                required
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="555-123-4567"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Address Field */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street, City, State, ZIP"
              />
            </div>

            {/* Emergency Contact Field */}
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                type="text"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Emergency contact name"
              />
            </div>

            {/* Emergency Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyPhone"
                name="emergencyPhone"
                type="tel"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="555-123-4567"
              />
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any additional notes about the parent or child..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/payment-plans/new">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Add Parent
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}
