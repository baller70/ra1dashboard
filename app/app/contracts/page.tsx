// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation

import { useState, useEffect } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Checkbox } from '../../components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useToast } from '../../hooks/use-toast'
import { Toaster } from '../../components/ui/toaster'
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Upload,
  Calendar,
  User,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

interface ContractData {
  id: string
  parentId: string
  parentName: string
  parentEmail: string
  parentPhone?: string
  fileName: string
  originalName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  status: string
  templateType?: string
  uploadedAt: string
  signedAt?: string
  expiresAt?: string
  version: string
  notes?: string
}

export default function ContractsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [selectedContracts, setSelectedContracts] = useState<string[]>([])
  const [bulkOperating, setBulkOperating] = useState(false)

  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContracts()
  }, [statusFilter, templateFilter])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (templateFilter !== 'all') params.append('templateType', templateFilter)
      
      const response = await fetch(`/api/contracts?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setContracts(data?.contracts || [])
        toast({
          title: "✅ Contracts Loaded",
          description: `Found ${data?.contracts?.length || 0} contracts`,
        })
      } else {
        throw new Error(data.error || 'Failed to fetch contracts')
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      toast({
        title: "❌ Error Loading Contracts",
        description: error instanceof Error ? error.message : 'Failed to load contracts',
        variant: "destructive",
      })
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContracts = contracts.filter((contract: any) => {
    const parentName = contract.parentName || contract.parent?.name || ''
    const parentEmail = contract.parentEmail || contract.parent?.email || ''
    const originalName = contract.originalName || ''
    
    const matchesSearch = parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         originalName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleContractSelection = (contractId: string, selected: boolean) => {
    if (selected) {
      setSelectedContracts(prev => [...prev, contractId])
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId))
    }
  }

  const selectAllContracts = () => {
    setSelectedContracts(filteredContracts.map((c: any) => c._id))
  }

  const clearSelection = () => {
    setSelectedContracts([])
  }

  const handleBulkOperation = async (action: string) => {
    if (selectedContracts.length === 0) return

    setBulkOperating(true)
    try {
      const response = await fetch('/api/contracts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          contractIds: selectedContracts
        })
      })

      if (response.ok) {
        // Refresh contracts data
        await fetchContracts()
        setSelectedContracts([])
        toast({
          title: "✅ Bulk Operation Complete",
          description: `Successfully ${action === 'delete' ? 'deleted' : 'updated'} ${selectedContracts.length} contracts`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk operation failed')
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      toast({
        title: "❌ Bulk Operation Failed",
        description: error instanceof Error ? error.message : 'Bulk operation failed',
        variant: "destructive",
      })
    } finally {
      setBulkOperating(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'rejected':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-3 w-3" />
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'expired':
        return <AlertTriangle className="h-3 w-3" />
      case 'rejected':
        return <XCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const calculateSummary = () => {
    const total = contracts.length
    const signed = contracts.filter((c: any) => c.status === 'signed').length
    const pending = contracts.filter((c: any) => c.status === 'pending').length
    const expired = contracts.filter((c: any) => c.status === 'expired').length
    const expiringSoon = contracts.filter((c: any) => {
      if (!c.expiresAt || c.status !== 'signed') return false
      const expiryDate = new Date(c.expiresAt)
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      return expiryDate <= thirtyDaysFromNow && expiryDate > new Date()
    }).length

    return { total, signed, pending, expired, expiringSoon }
  }

  const summary = calculateSummary()

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
            <p className="text-muted-foreground">
              Manage parent contracts and documentation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild>
              <Link href="/contracts/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Contract
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.signed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.expiringSoon}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Operations */}
        {selectedContracts.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedContracts.length} contract{selectedContracts.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkOperation('updateStatus')}
                    disabled={bulkOperating}
                  >
                    Mark as Signed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkOperation('sendReminder')}
                    disabled={bulkOperating}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleBulkOperation('delete')}
                    disabled={bulkOperating}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={selectAllContracts}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by parent name, email, or file name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select onValueChange={(value) => setStatusFilter(value)} value={statusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => setTemplateFilter(value)} value={templateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="camp">Camp</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts List */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract: any) => (
                  <div key={contract._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedContracts.includes(contract._id)}
                        onCheckedChange={(checked) => handleContractSelection(contract._id, checked as boolean)}
                      />
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(contract.status)} className="flex items-center space-x-1">
                          {getStatusIcon(contract.status)}
                          <span>{contract.status}</span>
                        </Badge>
                        {contract.templateType && (
                          <Badge variant="outline" className="capitalize">
                            {contract.templateType}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{contract.parentName || contract.parent?.name || 'Unknown Parent'}</p>
                        <p className="text-sm text-muted-foreground">{contract.parentEmail || contract.parent?.email || 'No email'}</p>
                        {contract.originalName && (
                          <p className="text-xs text-muted-foreground">{contract.originalName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      {contract.uploadedAt && (
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(contract.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                      {contract.signedAt && (
                        <p className="text-sm text-green-600">
                          Signed: {new Date(contract.signedAt).toLocaleDateString()}
                        </p>
                      )}
                      {contract.expiresAt && (
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(contract.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* The original code had a check for isNewContract, but the new ContractData interface doesn't have it.
                          Assuming it's no longer relevant or needs to be re-evaluated based on the new data structure.
                          For now, removing the check as it's not in the new interface. */}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/contracts/${contract._id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Link>
                      </Button>
                      {contract.fileUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(contract.fileUrl, '_blank')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Open File
                        </Button>
                      )}
                      {!contract.fileUrl && (
                        <Button asChild size="sm">
                          <Link href={`/contracts/upload?parentId=${contract.parentId}`}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || templateFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'Contract records will appear here once you start managing contracts'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/contracts/upload">
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Your First Contract
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </AppLayout>
  )
}
