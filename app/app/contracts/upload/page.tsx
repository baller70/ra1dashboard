
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'
import { 
  ArrowLeft,
  Upload,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface Parent {
  _id: string
  name: string
  email: string
}

function ContractUploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parentId = searchParams.get('parentId')
  const { toast } = useToast()
  
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParentId, setSelectedParentId] = useState(parentId || '')
  const [file, setFile] = useState<File | null>(null)
  const [templateType, setTemplateType] = useState('')
  const [notes, setNotes] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchParents()
  }, [])

  const fetchParents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/parents?limit=1000')
      const data = await response.json()
      
      if (response.ok) {
        setParents(data.data?.parents || [])
      } else {
        throw new Error(data.error || 'Failed to fetch parents')
      }
    } catch (error) {
      console.error('Failed to fetch parents:', error)
      toast({
        title: "❌ Error Loading Parents",
        description: error instanceof Error ? error.message : 'Failed to load parents',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "❌ Invalid File Type",
          description: "Only PDF and Word documents are allowed.",
          variant: "destructive",
        })
        return
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (selectedFile.size > maxSize) {
        toast({
          title: "❌ File Too Large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedParentId) {
      toast({
        title: "❌ Missing Information",
        description: "Please select a file and parent",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parentId', selectedParentId)
      if (templateType) formData.append('templateType', templateType)
      if (notes) formData.append('notes', notes)
      if (expiresAt) formData.append('expiresAt', expiresAt)

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "✅ Contract Uploaded",
          description: "Contract uploaded successfully",
        })
        router.push('/contracts')
      } else {
        const error = await response.json()
        toast({
          title: "❌ Upload Failed",
          description: error.error || 'Failed to upload contract',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "❌ Upload Error",
        description: "Failed to upload contract",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

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
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Contracts
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Upload Contract</h1>
              <p className="text-muted-foreground">
                Upload a new contract document for a parent
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Parent *</label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                  required
                >
                  <option value="">Select a parent...</option>
                  {parents.map((parent) => (
                    <option key={parent._id} value={parent._id}>
                      {parent.name} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Contract File *</label>
                <div className="mt-1">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PDF, DOC, DOCX (Max size: 10MB)
                  </p>
                </div>
                {file && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}
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
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Set when this contract expires
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this contract..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !file || !selectedParentId}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Contract
                    </>
                  )}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/contracts">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                Upload Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Only PDF and Word documents (.pdf, .doc, .docx) are accepted</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Maximum file size is 10MB</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Make sure the contract is complete and ready for signature</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Set an expiry date to track contract validity</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </AppLayout>
  )
}

export default function ContractUploadPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
        <Toaster />
      </AppLayout>
    }>
      <ContractUploadPageContent />
    </Suspense>
  )
}
