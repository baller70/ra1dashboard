'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Receipt, 
  Users, 
  Send, 
  Mail, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Sparkles,
  Eye,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const SEASONS = [
  { id: 'spring-aau', name: 'Spring AAU' },
  { id: 'summer-aau', name: 'Summer AAU' },
  { id: 'fall-aau', name: 'Fall AAU' },
  { id: 'winter-aau', name: 'Winter AAU' },
]

interface Parent {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string
  childName?: string
}

interface FeeRecord {
  id: string
  parentId: string
  parentName: string
  parentEmail: string
  childName?: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  paidAt?: string
  stripePaymentId?: string
}

interface FeeManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feeType: 'league' | 'tournament'
  currentParentId?: string
}

export function FeeManagementDialog({ 
  open, 
  onOpenChange, 
  feeType,
  currentParentId 
}: FeeManagementDialogProps) {
  const [activeTab, setActiveTab] = useState('manage')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Fee settings
  const [selectedSeason, setSelectedSeason] = useState('')
  const [feeName, setFeeName] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  
  // Parents
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [parentsLoading, setParentsLoading] = useState(false)
  
  // Message
  const [messageSubject, setMessageSubject] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [previewParent, setPreviewParent] = useState<Parent | null>(null)
  const [generatingMessage, setGeneratingMessage] = useState(false)
  
  // Fee records (for tracking payments)
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([])
  const [existingFees, setExistingFees] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchParents()
      fetchExistingFees()
      // Set default message template
      const feeLabel = feeType === 'league' ? 'league fee' : 'tournament fee'
      setMessageSubject(`${feeType === 'league' ? 'League' : 'Tournament'} Fee Payment Required`)
      setMessageTemplate(`Dear {parentName},\n\nThis is a reminder that the ${feeLabel} for {childName} is due.\n\nAmount: ${feeAmount ? `$${feeAmount}` : '{amount}'}\nDue Date: ${dueDate || '{dueDate}'}\n\nPlease click the link below to complete your payment:\n{paymentLink}\n\nThank you for your prompt attention to this matter.\n\nBest regards,\nRise as One Basketball`)
    }
  }, [open, feeType])

  useEffect(() => {
    if (feeAmount || dueDate) {
      const feeLabel = feeType === 'league' ? 'league fee' : 'tournament fee'
      setMessageTemplate(`Dear {parentName},\n\nThis is a reminder that the ${feeLabel} for {childName} is due.\n\nAmount: $${feeAmount || '{amount}'}\nDue Date: ${dueDate || '{dueDate}'}\n\nPlease click the link below to complete your payment:\n{paymentLink}\n\nThank you for your prompt attention to this matter.\n\nBest regards,\nRise as One Basketball`)
    }
  }, [feeAmount, dueDate, feeType])

  const fetchParents = async () => {
    setParentsLoading(true)
    try {
      const res = await fetch('/api/parents?limit=1000', {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      })
      const data = await res.json()
      const parentsList = data?.data?.parents || data?.parents || []
      setParents(parentsList)
      
      // If we have a current parent, pre-select them
      if (currentParentId) {
        setSelectedParents([currentParentId])
      }
    } catch (error) {
      console.error('Failed to fetch parents:', error)
    } finally {
      setParentsLoading(false)
    }
  }

  const fetchExistingFees = async () => {
    try {
      const endpoint = feeType === 'league' ? '/api/league-fees' : '/api/tournament-fees'
      const res = await fetch(`${endpoint}?limit=100`, {
        headers: { 'x-api-key': 'ra1-dashboard-api-key-2024' }
      })
      if (res.ok) {
        const data = await res.json()
        setExistingFees(data?.fees || data?.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch existing fees:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedParents.length === parents.length) {
      setSelectedParents([])
    } else {
      setSelectedParents(parents.map(p => p.id || p._id || ''))
    }
  }

  const handleParentToggle = (parentId: string) => {
    setSelectedParents(prev => 
      prev.includes(parentId) 
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    )
  }

  const generatePersonalizedMessage = (parent: Parent) => {
    return messageTemplate
      .replace(/{parentName}/g, parent.name)
      .replace(/{childName}/g, parent.childName || parent.name.split(' ')[0])
      .replace(/{amount}/g, feeAmount || '0')
      .replace(/{dueDate}/g, dueDate ? new Date(dueDate).toLocaleDateString() : 'TBD')
      .replace(/{paymentLink}/g, '[Stripe Payment Link]')
  }

  const handleAIGenerateMessage = async () => {
    setGeneratingMessage(true)
    try {
      const feeLabel = feeType === 'league' ? 'league fee' : 'tournament fee'
      const res = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify({
          prompt: `Write a friendly but professional email reminder for a ${feeLabel} payment. The amount is $${feeAmount || '100'} and it's due on ${dueDate || 'soon'}. Include placeholders {parentName}, {childName}, {amount}, {dueDate}, and {paymentLink}. Keep it concise and warm.`,
          type: 'fee_reminder'
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setMessageTemplate(data.message)
          toast.success('AI message generated!')
        }
      } else {
        toast.error('Failed to generate message')
      }
    } catch (error) {
      toast.error('Error generating message')
    } finally {
      setGeneratingMessage(false)
    }
  }

  const handleCreateAndSend = async () => {
    if (!selectedSeason || !feeName || !feeAmount || !dueDate) {
      toast.error('Please fill in all fee details')
      return
    }
    
    if (selectedParents.length === 0) {
      toast.error('Please select at least one parent')
      return
    }

    setSending(true)
    
    try {
      const endpoint = feeType === 'league' ? '/api/league-fees/create-and-send' : '/api/tournament-fees/create-and-send'
      
      // Get selected parent details
      const selectedParentDetails = parents.filter(p => 
        selectedParents.includes(p.id || p._id || '')
      )
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        },
        body: JSON.stringify({
          season: selectedSeason,
          name: feeName,
          amount: parseFloat(feeAmount),
          dueDate: dueDate,
          feeType: feeType,
          parents: selectedParentDetails.map(p => ({
            id: p.id || p._id,
            name: p.name,
            email: p.email,
            childName: p.childName
          })),
          messageSubject,
          messageTemplate
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`${feeType === 'league' ? 'League' : 'Tournament'} fee created and ${selectedParents.length} reminders sent!`)
        fetchExistingFees()
        setActiveTab('manage')
        // Reset form
        setFeeName('')
        setFeeAmount('')
        setDueDate('')
        setSelectedParents([])
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create fee')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create and send fees')
    } finally {
      setSending(false)
    }
  }

  const getStats = () => {
    const relevantFees = existingFees.filter(f => f.feeType === feeType || f.type === feeType)
    const total = relevantFees.length
    const paid = relevantFees.filter(f => f.status === 'paid').length
    const pending = relevantFees.filter(f => f.status === 'pending' || f.status === 'overdue').length
    const revenue = relevantFees
      .filter(f => f.status === 'paid')
      .reduce((sum, f) => sum + (f.amount || 0), 0)
    
    return { total, paid, pending, revenue }
  }

  const stats = getStats()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {feeType === 'league' ? 'Create League Fee' : 'Create Tournament Fee'}
          </DialogTitle>
          <DialogDescription>
            Create {feeType} fees and send payment reminders to parents
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 py-3 border-y">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Fees</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-slate-500">Paid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">${stats.revenue.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Revenue</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Manage Fees
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Parent Selection
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send Reminders
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Manage Fees */}
          <TabsContent value="manage" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Fee Creation Form */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-slate-900">Create New Fee</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Season / Program</Label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select season..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Fee Name</Label>
                  <Input 
                    placeholder={feeType === 'league' ? 'e.g., Spring League Registration' : 'e.g., March Madness Tournament'}
                    value={feeName}
                    onChange={(e) => setFeeName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => setActiveTab('parents')}
                disabled={!selectedSeason || !feeName || !feeAmount || !dueDate}
                className="w-full"
              >
                Continue to Parent Selection
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Existing Fees List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Existing {feeType === 'league' ? 'League' : 'Tournament'} Fees</h3>
              
              {existingFees.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {existingFees.map((fee, idx) => (
                    <div 
                      key={fee.id || fee._id || idx}
                      className={`p-4 rounded-xl border ${
                        fee.status === 'paid' 
                          ? 'bg-green-50 border-green-200' 
                          : fee.status === 'overdue'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-900">{fee.name || fee.feeName || 'Fee'}</h4>
                          <p className="text-sm text-slate-500">{fee.parentName || 'Unknown Parent'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${fee.amount?.toLocaleString() || '0'}</p>
                          <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {fee.status === 'paid' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                            ) : fee.status === 'overdue' ? (
                              <><AlertCircle className="h-3 w-3 mr-1" /> Overdue</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-1" /> Pending</>
                            )}
                          </Badge>
                        </div>
                      </div>
                      {fee.paidAt && (
                        <p className="text-xs text-green-600">Paid on {new Date(fee.paidAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No {feeType} fees created yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Parent Selection */}
          <TabsContent value="parents" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Select Parents</h3>
                <p className="text-sm text-slate-500">{selectedParents.length} of {parents.length} selected</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedParents.length === parents.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            {parentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parents.map((parent) => {
                  const parentId = parent.id || parent._id || ''
                  const isSelected = selectedParents.includes(parentId)
                  
                  return (
                    <div 
                      key={parentId}
                      onClick={() => handleParentToggle(parentId)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{parent.name}</p>
                          <p className="text-sm text-slate-500 truncate">{parent.email}</p>
                        </div>
                        {parent.childName && (
                          <Badge variant="outline" className="shrink-0">
                            {parent.childName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab('manage')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setActiveTab('send')}
                disabled={selectedParents.length === 0}
                className="flex-1"
              >
                Continue to Message
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Tab 3: Send Reminders */}
          <TabsContent value="send" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Message Preview</h3>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Each parent will receive a personalized message. The {'{variables}'} will be replaced with their info.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input 
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message Template</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAIGenerateMessage}
                      disabled={generatingMessage}
                    >
                      {generatingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea 
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Preview for a selected parent */}
            {selectedParents.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview for: {parents.find(p => (p.id || p._id) === selectedParents[0])?.name || 'First Parent'}
                  </h3>
                </div>
                <div className="bg-white rounded-lg p-4 border text-sm whitespace-pre-wrap">
                  {generatePersonalizedMessage(
                    parents.find(p => (p.id || p._id) === selectedParents[0]) || 
                    { id: '', name: 'Parent Name', email: '', childName: 'Child' }
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Ready to Send</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• {feeType === 'league' ? 'League' : 'Tournament'} Fee: {feeName || 'Not set'}</li>
                <li>• Amount: ${feeAmount || '0'}</li>
                <li>• Due Date: {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}</li>
                <li>• Recipients: {selectedParents.length} parents</li>
                <li>• Each parent will receive a Stripe payment link</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab('parents')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleCreateAndSend}
                disabled={sending || selectedParents.length === 0 || !feeName || !feeAmount}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create & Send to {selectedParents.length} Parents
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

