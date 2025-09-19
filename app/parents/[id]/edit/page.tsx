'use client'

// Force dynamic rendering - prevent static generation

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '../../../../components/app-layout'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Label } from '../../../../components/ui/label'
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { Parent } from '../../../../lib/types'

export default function EditParentPage() {
  const router = useRouter()
  const params = useParams()
  const [parent, setParent] = useState<Parent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    childName: '',
    phone: '',
    address: '',
    status: 'active',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchParent(params.id as string)
    }
  }, [params.id])

  const fetchParent = async (id: string) => {
    try {
      const response = await fetch(`/api/parents/${id}`)
      if (response.ok) {
        const data = await response.json()
        setParent(data)
        setFormData({
          name: data.name || '',
          email: data.email || '',
          childName: data.childName || '',
          phone: data.phone || '',
          address: data.address || '',
          status: data.status || 'active',
          emergencyContact: data.emergencyContact || '',
          emergencyPhone: data.emergencyPhone || '',
          notes: data.notes || ''
        })
      } else {
        alert('Parent not found')
        router.push('/parents')
      }
    } catch (error) {
      console.error('Error fetching parent:', error)
      alert('Error loading parent data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      const response = await fetch(`/api/parents/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Add cache-busting timestamp to ensure fresh data is loaded
        const timestamp = Date.now()
        router.push(`/parents/${params.id}?updated=${timestamp}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update parent')
      }
    } catch (error) {
      console.error('Error updating parent:', error)
      alert('Error updating parent')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading parent data...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!parent) {
    return (
      <AppLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Parent Not Found</h1>
          <Button asChild>
            <Link href="/parents">Back to Parents</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/parents/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Parent</h1>
            <p className="text-gray-600">Update parent information</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Parent Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10"
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              {/* Player/Child Name */}
              <div className="space-y-2">
                <Label htmlFor="childName">Player/Child Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="childName"
                    type="text"
                    value={formData.childName}
                    onChange={(e) => handleInputChange('childName', e.target.value)}
                    className="pl-10"
                    placeholder="Enter player's/child's name"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="pl-10"
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  placeholder="Emergency contact information"
                />
              </div>

              {/* Emergency Phone */}
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                  placeholder="Emergency phone number"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Additional notes about this parent..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/parents/${params.id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
