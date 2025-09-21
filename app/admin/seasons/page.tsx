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
  Receipt
} from 'lucide-react'

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

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'summer_league',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    description: ''
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

  const handleBulkCreateFees = async (seasonId: string, paymentMethod: string) => {
    try {
      const response = await fetch('/api/league-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          paymentMethod,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: `Created ${data.data.created} league fees for all active parents`,
        })
        fetchSeasons()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create league fees',
        variant: 'destructive',
      })
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
                    onClick={() => handleBulkCreateFees(season._id, 'online')}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Create Online Fees
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkCreateFees(season._id, 'in_person')}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Create In-Person Fees
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
      </div>
    </AppLayout>
  )
}
