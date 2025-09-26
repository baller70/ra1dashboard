'use client'

import { useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'
import { Save, UserPlus } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

interface ParentCreationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onParentCreated?: (parent: any) => void
}

export function ParentCreationModal({ open, onOpenChange, onParentCreated }: ParentCreationModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/parents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include API key in production to avoid any auth edge cases
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          emergencyContact: formData.emergencyContact || undefined,
          emergencyPhone: formData.emergencyPhone || undefined,
          notes: formData.notes || undefined,
          status: 'active'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create parent')
      }

      toast({
        title: "Parent created successfully!",
        description: `Parent ${result.data.name} has been added.`,
      })
      // Ensure latest list is fetched after creation
      if (typeof window !== 'undefined') {
        try {
          await fetch(`/api/parents?_t=${Date.now()}`, { cache: 'no-store' })
        } catch {}
      }

      const normalized = { ...result.data, _id: String(result.data._id) }
      onParentCreated?.(normalized) // Pass the newly created parent data
      // Notify other views
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('parent-created'))
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error creating parent",
        description: error.message || 'An unexpected error occurred.',
        variant: "destructive",
      })
      console.error('Error creating parent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Parent
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter parent's full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="parent@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input
                id="emergencyPhone"
                placeholder="(555) 987-6543"
                value={formData.emergencyPhone}
                onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
            <Input
              id="emergencyContact"
              placeholder="Emergency contact person"
              value={formData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about the parent or child..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name || !formData.email}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Adding Parent...' : 'Add Parent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 