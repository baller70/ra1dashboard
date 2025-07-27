'use client'

// Force dynamic rendering - prevent static generation
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft,
  FileText,
  Download,
  Edit,
  Save,
  Calendar,
  User,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'

interface Contract {
  _id: string
  fileName: string
  originalName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  status: string
  uploadedAt: number
  signedAt?: number
  expiresAt?: number
  templateType?: string
  notes?: string
  parent: {
    _id: string
    name: string
    email: string
    phone?: string
  }
}

export default function ContractViewPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  const { toast } = useToast()
  
  const [contract, setContract] = useState<Contract | null>(null)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('')
  const [templateType, setTemplateType] = useState('')
  const [notes, setNotes] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}`)
      if (response.ok) {
        const data = await response.json()
        setContract(data)
        setStatus(data.status)
        setTemplateType(data.templateType || '')
        setNotes(data.notes || '')
        setExpiresAt(data.expiresAt ? new Date(data.expiresAt).toISOString().split('T')[0] : '')
      } else {
        toast({
          title: "❌ Contract Not Found",
          description: "The contract you're looking for doesn't exist",
          variant: "destructive",
        })
        router.push('/contracts')
      }
    } catch (error) {
      console.error('Failed to fetch contract:', error)
      toast({
        title: "❌ Error Loading Contract",
        description: "Failed to load contract details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contract) return

    setSaving(true)
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          templateType: templateType || null,
          notes: notes || null,
          expiresAt: expiresAt || null
        })
      })

      if (response.ok) {
        const updatedContract = await response.json()
        setContract(updatedContract.contract || updatedContract)
        setEditing(false)
        toast({
          title: "✅ Contract Updated",
          description: "Contract details have been updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "❌ Update Failed",
          description: error.error || 'Failed to update contract',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Update error:', error)
      toast({
        title: "❌ Update Error",
        description: "Failed to update contract",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />
      case 'expired':
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
            <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
        <Toaster />
      </AppLayout>
  )
}

  if (!contract) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Contract not found</h3>
          <Button asChild>
            <Link href="/contracts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contracts
            </Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Contracts
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contract Details</h1>
              <p className="text-muted-foreground">
                View and manage contract information
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => window.open(contract.fileUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View File
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(!editing)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contract Information
                  </div>
                  <Badge variant={getStatusVariant(contract.status)} className="flex items-center space-x-1">
                    {getStatusIcon(contract.status)}
                    <span className="capitalize">{contract.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">File Name</label>
                    <p className="text-sm text-muted-foreground mt-1">{contract.originalName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">File Size</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(contract.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Uploaded</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(contract.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contract ID</label>
                    <p className="text-sm text-muted-foreground mt-1 font-mono text-xs">{contract._id}</p>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="pending">Pending</option>
                        <option value="signed">Signed</option>
                        <option value="expired">Expired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Template Type</label>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select template type...</option>
                        <option value="seasonal">Seasonal</option>
                        <option value="annual">Annual</option>
                        <option value="tournament">Tournament</option>
                        <option value="camp">Camp</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Expiry Date</label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this contract..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full"
                    >
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
                ) : (
                  <div className="space-y-4">
                    {contract.templateType && (
                      <div>
                        <label className="text-sm font-medium">Template Type</label>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          {contract.templateType}
                        </p>
                      </div>
                    )}

                    {contract.expiresAt && (
                      <div>
                        <label className="text-sm font-medium">Expires</label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(contract.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {contract.signedAt && (
                      <div>
                        <label className="text-sm font-medium">Signed</label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(contract.signedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {contract.notes && (
                      <div>
                        <label className="text-sm font-medium">Notes</label>
                        <p className="text-sm text-muted-foreground mt-1">{contract.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parent Information */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Parent Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground mt-1">{contract.parent.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{contract.parent.email}</p>
                  </div>
                </div>

                {contract.parent.phone && (
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{contract.parent.phone}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/parents/${contract.parent._id}`}>
                      <User className="mr-2 h-4 w-4" />
                      View Parent Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
