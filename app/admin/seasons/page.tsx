'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog'
import { Checkbox } from '../../../components/ui/checkbox'
import { Textarea } from '../../../components/ui/textarea'
import { useToast } from '../../../hooks/use-toast'


import {
  Calendar,
  Plus,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Trash2,
  Edit,
  Receipt,
  UserPlus,
  Eye,
  CreditCard,
  Mail,
  Send,
  CheckSquare,
  Square,
  UserCheck,
  Edit3
} from 'lucide-react'

// Email Preview Dialog Component
interface EmailPreviewData {
  subject: string
  body: string
  paymentAmount: number
  processingFee: number
  totalAmount: number
  seasonName: string
  dueDate: string
  stripePaymentLink: string
  facilityPaymentLink: string
}

interface Season {
  _id: string
  name: string
  type: string
  year: number
  startDate: number
  endDate: number
  registrationDeadline?: number
  isActive: boolean
  description?: string
  stats?: {
    totalFees: number
    paidFees: number
    pendingFees: number
    overdueFees: number
    totalRevenue: number
    paymentRate: number
  }
}

interface Parent {
  _id: string
  name: string
  email: string
  childName?: string
  phone?: string
  status: string
}

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
  parent: Parent
  season: {
    _id: string
    name: string
    type: string
    year: number
  }
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showLeagueFeesDialog, setShowLeagueFeesDialog] = useState(false)
  const [showCreateFeeDialog, setShowCreateFeeDialog] = useState(false)
  const [showParentSelectionDialog, setShowParentSelectionDialog] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [leagueFees, setLeagueFees] = useState<LeagueFee[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [selectAllParents, setSelectAllParents] = useState(false)
  const [feesLoading, setFeesLoading] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [showEmailPreviewDialog, setShowEmailPreviewDialog] = useState(false)
  const [emailPreviewData, setEmailPreviewData] = useState<any>(null)
  const [generatingEmailPreview, setGeneratingEmailPreview] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'summer_league',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    description: ''
  })
  const [feeFormData, setFeeFormData] = useState({
    parentId: '',
    amount: 95,
    paymentMethod: 'online',
    dueDate: '',
    notes: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons?withStats=true')
      const data = await response.json()
      if (data.success) {
        setSeasons(data.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch seasons',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSeason = async () => {
    try {
      const response = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).getTime(),
          endDate: new Date(formData.endDate).getTime(),
          registrationDeadline: formData.registrationDeadline 
            ? new Date(formData.registrationDeadline).getTime() 
            : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Season created successfully',
        })
        setShowCreateDialog(false)
        setFormData({
          name: '',
          type: 'summer_league',
          year: new Date().getFullYear(),
          startDate: '',
          endDate: '',
          registrationDeadline: '',
          description: ''
        })
        fetchSeasons()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create season',
        variant: 'destructive',
      })
    }
  }

  const fetchParents = async () => {
    try {
      const response = await fetch('/api/parents?limit=1000')
      const data = await response.json()
      if (data.success) {
        setParents(data.data.parents || [])
      }
    } catch (error) {
      console.error('Failed to fetch parents:', error)
    }
  }

  const fetchLeagueFees = async (seasonId: string) => {
    try {
      setFeesLoading(true)
      const response = await fetch(`/api/league-fees?seasonId=${seasonId}`)
      const data = await response.json()
      if (data.success) {
        setLeagueFees(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch league fees:', error)
    } finally {
      setFeesLoading(false)
    }
  }

  const handleViewLeagueFees = async (season: Season) => {
    setSelectedSeason(season)
    setShowLeagueFeesDialog(true)
    await fetchParents()
    await fetchLeagueFees(season._id)
  }

  const handleCreateIndividualFee = async () => {
    if (!selectedSeason || !feeFormData.parentId) return

    try {
      const response = await fetch('/api/league-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason._id,
          parentId: feeFormData.parentId,
          paymentMethod: feeFormData.paymentMethod,
          amount: feeFormData.amount,
          dueDate: feeFormData.dueDate ? new Date(feeFormData.dueDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: feeFormData.notes
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'League fee created successfully',
        })
        setShowCreateFeeDialog(false)
        setFeeFormData({
          parentId: '',
          amount: 95,
          paymentMethod: 'online',
          dueDate: '',
          notes: ''
        })
        await fetchLeagueFees(selectedSeason._id)
        await fetchSeasons()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create league fee',
        variant: 'destructive',
      })
    }
  }

  const handleParentSelection = (season: Season) => {
    setSelectedSeason(season)
    setShowParentSelectionDialog(true)
    fetchParents()
    setSelectedParents([])
    setSelectAllParents(false)
  }

  const handleSelectAllParents = (checked: boolean) => {
    setSelectAllParents(checked)
    if (checked) {
      setSelectedParents(parents.filter(p => p.status === 'active').map(p => p._id))
    } else {
      setSelectedParents([])
    }
  }

  const handleParentToggle = (parentId: string) => {
    setSelectedParents(prev => {
      const newSelection = prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]

      // Update select all checkbox state
      const activeParents = parents.filter(p => p.status === 'active')
      setSelectAllParents(newSelection.length === activeParents.length)

      return newSelection
    })
  }

  const handlePreviewEmail = async () => {
    if (!selectedSeason || selectedParents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one parent to preview email for',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingEmailPreview(true)
      const response = await fetch('/api/league-fees/generate-email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason._id,
          parentIds: selectedParents
        })
      })

      const data = await response.json()
      if (data.success) {
        setEmailPreviewData(data.data.emailPreview)
        setShowEmailPreviewDialog(true)
        setShowParentSelectionDialog(false)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate email preview',
        variant: 'destructive',
      })
    } finally {
      setGeneratingEmailPreview(false)
    }
  }

  const handleSendReminders = async () => {
    if (!selectedSeason || selectedParents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one parent to send reminders to',
        variant: 'destructive',
      })
      return
    }

    try {
      setSendingEmails(true)
      const response = await fetch('/api/league-fees/send-bulk-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason._id,
          parentIds: selectedParents
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: `Sent ${data.data.sent} reminder emails successfully`,
        })
        setShowParentSelectionDialog(false)
        setSelectedParents([])
        setSelectAllParents(false)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reminders',
        variant: 'destructive',
      })
    } finally {
      setSendingEmails(false)
    }
  }

  const handleSendEmailsWithCustomContent = async (subject: string, body: string) => {
    if (!selectedSeason || selectedParents.length === 0) {
      toast({
        title: 'Error',
        description: 'No parents selected for sending emails',
        variant: 'destructive',
      })
      return
    }

    try {
      setSendingEmails(true)
      const response = await fetch('/api/league-fees/send-bulk-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason._id,
          parentIds: selectedParents,
          customSubject: subject,
          customBody: body
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: `Sent ${data.data.sent} reminder emails successfully`,
        })
        setShowEmailPreviewDialog(false)
        setSelectedParents([])
        setSelectAllParents(false)
        setEmailPreviewData(null)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send emails',
        variant: 'destructive',
      })
    } finally {
      setSendingEmails(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading seasons...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Season Management</h1>
            <p className="text-muted-foreground">
              Manage basketball seasons and league fees
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Season
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Season Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer League 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Season Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summer_league">Summer League</SelectItem>
                      <SelectItem value="fall_tournament">Fall Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="registrationDeadline">Registration Deadline (Optional)</Label>
                  <Input
                    id="registrationDeadline"
                    type="date"
                    value={formData.registrationDeadline}
                    onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateSeason} className="w-full">
                  Create Season
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {seasons.map((season) => (
            <Card key={season._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {season.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {season.type === 'summer_league' ? 'Summer League' : 'Fall Tournament'} • {season.year}
                    </p>
                  </div>
                  <Badge variant={season.isActive ? 'default' : 'secondary'}>
                    {season.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {season.stats?.totalFees || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Fees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {season.stats?.paidFees || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {season.stats?.pendingFees || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${season.stats?.totalRevenue || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewLeagueFees(season)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Manage Fees
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleParentSelection(season)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Parent Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleParentSelection(season)}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Reminders
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {seasons.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No seasons found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first season to start managing league fees
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Season
            </Button>
          </div>
        )}

        {/* League Fees Management Dialog */}
        <Dialog open={showLeagueFeesDialog} onOpenChange={setShowLeagueFeesDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Manage League Fees - {selectedSeason?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {leagueFees.length} league fees found
                </div>
                <Button
                  onClick={() => setShowCreateFeeDialog(true)}
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Individual Fee
                </Button>
              </div>

              {feesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {leagueFees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No league fees found for this season
                    </div>
                  ) : (
                    leagueFees.map((fee) => (
                      <Card key={fee._id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="font-medium">{fee.parent.name}</div>
                              <div className="text-sm text-muted-foreground">{fee.parent.email}</div>
                            </div>
                            <Badge variant={fee.status === 'paid' ? 'default' : 'secondary'}>
                              {fee.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${fee.totalAmount}</div>
                            <div className="text-sm text-muted-foreground">
                              Due: {new Date(fee.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Individual Fee Dialog */}
        <Dialog open={showCreateFeeDialog} onOpenChange={setShowCreateFeeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Create League Fee
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="parent">Parent</Label>
                <Select
                  value={feeFormData.parentId}
                  onValueChange={(value) => setFeeFormData({ ...feeFormData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.filter(p => p.status === 'active').map((parent) => (
                      <SelectItem key={parent._id} value={parent._id}>
                        {parent.name} ({parent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={feeFormData.amount}
                  onChange={(e) => setFeeFormData({ ...feeFormData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={feeFormData.paymentMethod}
                  onValueChange={(value) => setFeeFormData({ ...feeFormData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online Payment</SelectItem>
                    <SelectItem value="in_person">In-Person Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={feeFormData.dueDate}
                  onChange={(e) => setFeeFormData({ ...feeFormData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={feeFormData.notes}
                  onChange={(e) => setFeeFormData({ ...feeFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateFeeDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateIndividualFee}
                  disabled={!feeFormData.parentId}
                  className="flex-1"
                >
                  Create Fee
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Parent Selection Dialog */}
        <Dialog open={showParentSelectionDialog} onOpenChange={setShowParentSelectionDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Parent Selection - {selectedSeason?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAllParents}
                    onCheckedChange={handleSelectAllParents}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Select All Parents
                  </Label>
                </div>
                <Badge variant="outline">
                  {selectedParents.length} of {parents.filter(p => p.status === 'active').length} selected
                </Badge>
              </div>

              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {parents.filter(p => p.status === 'active').map((parent) => (
                    <div key={parent._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={parent._id}
                        checked={selectedParents.includes(parent._id)}
                        onCheckedChange={() => handleParentToggle(parent._id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={parent._id} className="font-medium cursor-pointer">
                          {parent.name}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          {parent.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowParentSelectionDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePreviewEmail}
                  disabled={selectedParents.length === 0 || generatingEmailPreview}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {generatingEmailPreview ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Email ({selectedParents.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <Dialog open={showEmailPreviewDialog} onOpenChange={setShowEmailPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Preview - {selectedSeason?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Recipients Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Recipients ({selectedParents.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parents.filter(p => selectedParents.includes(p._id)).slice(0, 10).map((parent) => (
                    <Badge key={parent._id} variant="secondary" className="text-xs">
                      {parent.name}
                    </Badge>
                  ))}
                  {selectedParents.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedParents.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              {generatingEmailPreview ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-gray-600">Generating AI-powered email template...</span>
                </div>
              ) : emailPreviewData ? (
                <>
                  {/* Payment Details */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">Payment Details</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <div className="font-medium">${emailPreviewData.paymentAmount}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Processing Fee:</span>
                        <div className="font-medium">${emailPreviewData.processingFee}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <div className="font-medium text-green-700">${emailPreviewData.totalAmount}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Due Date:</span>
                        <div className="font-medium">{emailPreviewData.dueDate}</div>
                      </div>
                    </div>
                  </div>

                  {/* Email Content Preview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Email Content</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Subject:</div>
                      <div className="font-medium">{emailPreviewData.subject}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {emailPreviewData.body}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowEmailPreviewDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSendEmailsWithCustomContent(emailPreviewData.subject, emailPreviewData.body)}
                      disabled={sendingEmails}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {sendingEmails ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending to {selectedParents.length} parents...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Emails to {selectedParents.length} Parents
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
