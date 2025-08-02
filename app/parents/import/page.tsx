
'use client'

// Force dynamic rendering - prevent static generation
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Progress } from '../../../components/ui/progress'
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  FileSpreadsheet,
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../../../hooks/use-toast'
import { Toaster } from '../../../components/ui/toaster'
import { BulkUploadValidation, BulkImportResult, BulkUploadParent, ValidationError } from '../../../lib/types'

interface EditableParent extends BulkUploadParent {
  rowNumber: number
  hasErrors: boolean
}

export default function BulkImportPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State management
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [validationData, setValidationData] = useState<BulkUploadValidation | null>(null)
  const [editableData, setEditableData] = useState<EditableParent[]>([])
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  // File handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed', e.target.files)
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const triggerFileInput = () => {
    console.log('Triggering file input...')
    // Add visual feedback
    toast({
      title: "File input triggered",
      description: "Opening file dialog...",
    })
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      console.log('File input element found, clicking...')
      fileInput.click()
    } else {
      console.error('File input element not found!')
      toast({
        title: "Error",
        description: "File input not found",
        variant: "destructive",
      })
    }
  }

  const handleFile = (selectedFile: File) => {
    console.log('File selected:', selectedFile.name, selectedFile.size, selectedFile.type)
    toast({
      title: "File selected",
      description: `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
    })
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      console.log('Invalid file extension:', fileExtension)
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or Excel file.",
        variant: "destructive",
      })
      return
    }

    console.log('File accepted, setting file state')
    setFile(selectedFile)
    toast({
      title: "File ready",
      description: "File is ready for processing. Click 'Process File' to continue.",
    })
  }

  const processFile = async () => {
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('Starting file processing...')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending request to /api/parents/bulk-upload')
      const response = await fetch('/api/parents/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status, response.ok)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process file')
      }

      const validation: BulkUploadValidation = await response.json()
      console.log('Validation result:', validation)
      setValidationData(validation)

      // Create editable data with row numbers and error flags
      const editable: EditableParent[] = validation.data.map((parent, index) => ({
        ...parent,
        rowNumber: index + 2, // +2 because array is 0-indexed and we skip header
        hasErrors: validation.errors.some(err => err.row === index + 2)
      }))

      setEditableData(editable)
      setCurrentStep('preview')

      toast({
        title: "File processed successfully",
        description: `Found ${validation.stats.totalRows} records with ${validation.stats.validRows} valid entries.`,
      })
    } catch (error) {
      console.error('File processing error:', error)
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Failed to process file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/parents/template')
      if (!response.ok) throw new Error('Failed to download template')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'parents_template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Template downloaded",
        description: "Use this template to format your parent data.",
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateParentData = (index: number, field: keyof BulkUploadParent, value: string) => {
    setEditableData(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeParent = (index: number) => {
    setEditableData(prev => prev.filter((_, i) => i !== index))
  }

  const proceedWithImport = async () => {
    if (!validationData || editableData.length === 0) return

    // Filter out parents with errors (unless user has fixed them)
    const validParents = editableData.filter(parent => {
      return parent.name.trim() && parent.email.trim() && 
             parent.email.includes('@') && parent.email.includes('.')
    })

    if (validParents.length === 0) {
      toast({
        title: "No valid records",
        description: "Please fix validation errors before importing.",
        variant: "destructive",
      })
      return
    }

    setCurrentStep('importing')
    setImportProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 200)

    try {
      const response = await fetch('/api/parents/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          parents: validParents.map(({ rowNumber, hasErrors, ...parent }) => parent)
        }),
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import parents')
      }

      const result: BulkImportResult = await response.json()
      setImportResult(result)
      setCurrentStep('results')

      if (result.success) {
        toast({
          title: "Import completed",
          description: `Successfully created ${result.created} parent profiles.`,
        })
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Import error:', error)
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import parents. Please try again.",
        variant: "destructive",
      })
      setCurrentStep('preview')
    }
  }

  const getErrorsForRow = (rowNumber: number): ValidationError[] => {
    return validationData?.errors.filter(err => err.row === rowNumber) || []
  }

  const filteredData = showErrorsOnly 
    ? editableData.filter(parent => parent.hasErrors)
    : editableData

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/parents">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Parents
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bulk Import Parents</h1>
              <p className="text-muted-foreground">
                Upload a CSV or Excel file to create multiple parent profiles at once
              </p>
            </div>
          </div>
          {/* Debug Panel */}
          <div className="text-sm bg-gray-100 p-2 rounded">
            <div>Step: {currentStep}</div>
            <div>File: {file ? file.name : 'None'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep !== 'upload' ? 'text-green-600' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'upload' ? 'bg-blue-600 text-white' :
                  ['preview', 'importing', 'results'].includes(currentStep) ? 'bg-green-600 text-white' :
                  'bg-gray-200'
                }`}>
                  {['preview', 'importing', 'results'].includes(currentStep) ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="ml-2 font-medium">Upload File</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full ${['preview', 'importing', 'results'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : ['importing', 'results'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'preview' ? 'bg-blue-600 text-white' :
                  ['importing', 'results'].includes(currentStep) ? 'bg-green-600 text-white' :
                  'bg-gray-200'
                }`}>
                  {['importing', 'results'].includes(currentStep) ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span className="ml-2 font-medium">Preview & Edit</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200">
                <div className={`h-full ${['results'].includes(currentStep) ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              </div>
              <div className={`flex items-center ${currentStep === 'importing' ? 'text-blue-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === 'importing' ? 'bg-blue-600 text-white' :
                  currentStep === 'results' ? 'bg-green-600 text-white' :
                  'bg-gray-200'
                }`}>
                  {currentStep === 'results' ? <CheckCircle className="h-4 w-4" /> : '3'}
                </div>
                <span className="ml-2 font-medium">Import</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 'upload' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Parent Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {file ? file.name : 'Drop your file here or click to browse'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports CSV and Excel files (.csv, .xlsx, .xls)
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <div 
                    onClick={triggerFileInput}
                    className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  >
                    Choose File
                  </div>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button 
                  onClick={processFile} 
                  disabled={!file || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing File...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Process File
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Sample Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Sample Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a sample template to understand the required format for your parent data.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Required Fields:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>name</strong> (required) - Parent's full name</li>
                    <li>• <strong>email</strong> (required) - Email address</li>
                    <li>• <strong>phone</strong> - Phone number</li>
                    <li>• <strong>address</strong> - Home address</li>
                    <li>• <strong>emergencyContact</strong> - Emergency contact person</li>
                    <li>• <strong>emergencyPhone</strong> - Emergency phone number</li>
                    <li>• <strong>notes</strong> - Additional notes</li>
                  </ul>
                </div>

                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'preview' && validationData && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Import Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validationData.stats.totalRows}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{validationData.stats.validRows}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{validationData.stats.errorRows}</div>
                    <div className="text-sm text-muted-foreground">With Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{validationData.duplicates.length}</div>
                    <div className="text-sm text-muted-foreground">Duplicates</div>
                  </div>
                </div>

                {validationData.stats.errorRows > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-800">
                        {validationData.stats.errorRows} records have validation errors that need to be fixed before import.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview Data ({filteredData.length} records)
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                    >
                      {showErrorsOnly ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                      {showErrorsOnly ? 'Show All' : 'Errors Only'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto">
                  <div className="space-y-3">
                    {filteredData.map((parent, index) => {
                      const actualIndex = editableData.findIndex(p => p.rowNumber === parent.rowNumber)
                      const errors = getErrorsForRow(parent.rowNumber)
                      
                      return (
                        <div key={parent.rowNumber} className={`p-4 border rounded-lg ${errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs">Name *</Label>
                                <Input
                                  value={parent.name}
                                  onChange={(e) => updateParentData(actualIndex, 'name', e.target.value)}
                                  className={errors.some(e => e.field === 'name') ? 'border-red-300' : ''}
                                  placeholder="Full name"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Email *</Label>
                                <Input
                                  value={parent.email}
                                  onChange={(e) => updateParentData(actualIndex, 'email', e.target.value)}
                                  className={errors.some(e => e.field === 'email') ? 'border-red-300' : ''}
                                  placeholder="email@example.com"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Phone</Label>
                                <Input
                                  value={parent.phone || ''}
                                  onChange={(e) => updateParentData(actualIndex, 'phone', e.target.value)}
                                  className={errors.some(e => e.field === 'phone') ? 'border-red-300' : ''}
                                  placeholder="+1-555-0123"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeParent(actualIndex)}
                              className="ml-2"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>

                          {errors.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {errors.map((error, errorIndex) => (
                                <div key={errorIndex} className="flex items-center text-xs text-red-600">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  <span><strong>{error.field}:</strong> {error.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    Back to Upload
                  </Button>
                  <Button 
                    onClick={proceedWithImport}
                    disabled={validationData.stats.validRows === 0}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Import {editableData.filter(p => !p.hasErrors).length} Parents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'importing' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">Importing Parents...</h3>
                <p className="text-muted-foreground">
                  Please wait while we create the parent profiles in your system.
                </p>
                <div className="max-w-md mx-auto">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {Math.round(importProgress)}% complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'results' && importResult && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                    <div className="text-sm text-muted-foreground">Successfully Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importResult.success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">
                        {importResult.created} parent profiles have been successfully created!
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4 mt-6">
                  <Button asChild>
                    <Link href="/parents">
                      <Users className="mr-2 h-4 w-4" />
                      View All Parents
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setCurrentStep('upload')
                    setFile(null)
                    setValidationData(null)
                    setEditableData([])
                    setImportResult(null)
                  }}>
                    Import More Parents
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Successful Imports */}
            {importResult.successfulParents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Successfully Created Parents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {importResult.successfulParents.map((parent) => (
                      <div key={parent.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div>
                          <span className="font-medium">{parent.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">({parent.email})</span>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/parents/${parent.id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Errors */}
            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Import Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-start">
                          <XCircle className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                          <div>
                            <span className="font-medium">Row {error.row}: {error.email}</span>
                            <p className="text-sm text-red-600">{error.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      <Toaster />
    </AppLayout>
  )
}
