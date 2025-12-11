// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { useToast } from '../../hooks/use-toast'
import { Toaster } from '../../components/ui/toaster'
import { 
  Search, 
  FileText,
  Upload,
  User,
  Mail,
  CheckCircle,
  XCircle,
  Sparkles,
  Send,
  FileSignature,
  Clock,
  Bell,
  Eye,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

const PROGRAMS = [
  { id: 'yearly-program', name: 'YEARLY PROGRAM' },
  { id: 'spring-aau', name: 'SPRING AAU' },
  { id: 'fall-aau', name: 'FALL AAU' },
  { id: 'summer-aau', name: 'SUMMER AAU' },
  { id: 'winter-aau', name: 'WINTER AAU' },
  { id: 'kevin-lessons', name: "KEVIN HOUSTON LESSONS" },
  { id: 'tbf-training', name: 'TBF TRAINING' },
  { id: 'thos-facility', name: 'THOS FACILITY RENTALS' },
]

const YEARS = [
  { id: '2024', name: '2024' },
  { id: '2025', name: '2025' },
  { id: '2026', name: '2026' },
  { id: '2027', name: '2027' },
  { id: '2028', name: '2028' },
  { id: '2029', name: '2029' },
  { id: '2030', name: '2030' },
]

interface Parent {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string
  program?: string
}

interface Contract {
  _id: string
  parentId: string
  status: string
  signedAt?: string
  uploadedAt?: string
}

export default function ContractsPage() {
  const { toast } = useToast()
  const [programFilter, setProgramFilter] = useState('yearly-program')
  const [yearFilter, setYearFilter] = useState('2025')
  const [searchTerm, setSearchTerm] = useState('')
  const [parents, setParents] = useState<Parent[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [contractMessage, setContractMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  // Reminder states
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState('weekly')
  const [reminderCount, setReminderCount] = useState('3')

  useEffect(() => {
    fetchData()
  }, [programFilter, yearFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const timestamp = Date.now()
      
      // Fetch parents with proper headers
      const parentsRes = await fetch(`/api/parents?limit=1000&_t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      const parentsData = await parentsRes.json()
      
      console.log('Contracts page - Parents API response:', {
        status: parentsRes.status,
        ok: parentsRes.ok,
        dataKeys: Object.keys(parentsData || {}),
        hasParents: !!(parentsData?.data?.parents || parentsData?.parents)
      })
      
      // Fetch contracts for this program and year
      const contractsRes = await fetch(`/api/contracts?program=${programFilter}&year=${yearFilter}&_t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })
      const contractsData = await contractsRes.json()
      
      // Handle both response formats: {parents: [...]} or {data: {parents: [...]}}
      const parentsList = parentsData?.data?.parents || parentsData?.parents || []
      console.log(`Contracts page - Total parents from API: ${parentsList.length}`)
      
      if (parentsRes.ok && parentsList.length > 0) {
        // Filter parents by program
        const filtered = parentsList.filter((p: Parent) => {
          if (!programFilter || programFilter === 'all') return true
          const parentProgram = (p.program || '').toLowerCase().replace(/\s+/g, '-')
          const matches = parentProgram === programFilter.toLowerCase()
          return matches
        })
        console.log(`Contracts page - Filtered to ${filtered.length} parents for program "${programFilter}"`)
        setParents(filtered)
      } else {
        console.log('Contracts page - No parents in response or response not ok')
        setParents([])
      }
      
      if (contractsRes.ok && contractsData?.contracts) {
        // Filter contracts by year if they have a year field
        const filteredContracts = contractsData.contracts.filter((c: any) => {
          if (!c.year) return true // Include contracts without year
          return c.year === yearFilter
        })
        setContracts(filteredContracts)
      }
    } catch (error) {
      console.error('Contracts page - Failed to fetch data:', error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const hasContract = (parentId: string): boolean => {
    return contracts.some(c => String(c.parentId) === String(parentId))
  }

  const getContractForParent = (parentId: string): Contract | undefined => {
    return contracts.find(c => String(c.parentId) === String(parentId))
  }

  const filteredParents = parents.filter(parent => {
    const matchesSearch = 
      parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Sort: missing contracts first
  const sortedParents = [...filteredParents].sort((a, b) => {
    const aHas = hasContract(a.id || a._id || '')
    const bHas = hasContract(b.id || b._id || '')
    if (aHas === bHas) return 0
    return aHas ? 1 : -1
  })

  const handleOpenSendDialog = (parent: Parent) => {
    setSelectedParent(parent)
    setContractMessage('')
    setSendDialogOpen(true)
  }

  const handleGenerateAIContract = async () => {
    if (!selectedParent) return
    
    setAiGenerating(true)
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a professional contract email for ${selectedParent.name} to sign their participation contract for the Rise as One Basketball program. Include:
          1. A warm greeting
          2. Explanation of what the contract covers (participation agreement, liability waiver, photo release)
          3. Instructions to click the link below to review and sign electronically
          4. A note about the deadline to complete
          5. Contact information for questions
          
          Make it professional but friendly. The parent's email is ${selectedParent.email}.`,
          type: 'contract_request'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setContractMessage(data.message || data.content || generateDefaultContract(selectedParent))
      } else {
        setContractMessage(generateDefaultContract(selectedParent))
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      setContractMessage(generateDefaultContract(selectedParent))
    } finally {
      setAiGenerating(false)
    }
  }

  const generateDefaultContract = (parent: Parent): string => {
    const programName = PROGRAMS.find(p => p.id === programFilter)?.name || 'Rise as One Basketball'
    return `Dear ${parent.name},

Welcome to the ${programName} ${yearFilter} program! We're excited to have your family join our basketball community.

Before your child can participate, we need you to review and sign our participation agreement. This contract covers:

• Participation Agreement & Code of Conduct
• Liability Waiver & Medical Release
• Photo/Video Release Authorization
• Payment Terms & Cancellation Policy

To complete your registration:
1. Click the link below to access the digital contract
2. Review all terms carefully
3. Sign electronically using your finger or mouse
4. Submit the signed contract

[SIGN CONTRACT ONLINE]

Please complete this by [DATE - typically 7 days]. If you have any questions, don't hesitate to reach out.

Thank you for choosing Rise as One Basketball!

Best regards,
Rise as One Basketball Team
admin@riseasone.com`
  }

  const handleSendContract = async () => {
    if (!selectedParent || !contractMessage) return
    
    setSending(true)
    try {
      // Create a contract signing link (placeholder - would integrate with e-sign service)
      const signingLink = `${window.location.origin}/contracts/sign?parentId=${selectedParent.id || selectedParent._id}&program=${programFilter}&year=${yearFilter}`
      
      // Send email with contract
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedParent.id || selectedParent._id,
          parentEmail: selectedParent.email,
          parentName: selectedParent.name,
          subject: `Contract Required: ${PROGRAMS.find(p => p.id === programFilter)?.name || 'Rise as One Basketball'} ${yearFilter}`,
          content: contractMessage.replace('[SIGN CONTRACT ONLINE]', `<a href="${signingLink}" style="display:inline-block;padding:12px 24px;background:#f97316;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Sign Contract Online</a>`),
          type: 'contract_request',
          method: 'email',
          program: programFilter,
          year: yearFilter
        })
      })
      
      if (response.ok) {
        toast({
          title: "✅ Contract Sent",
          description: `Contract request sent to ${selectedParent.email}`,
        })
        setSendDialogOpen(false)
        setSelectedParent(null)
        setContractMessage('')
      } else {
        throw new Error('Failed to send')
      }
    } catch (error) {
      console.error('Send failed:', error)
      toast({
        title: "Error",
        description: "Failed to send contract. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleSetupReminder = async () => {
    if (!selectedParent) return
    
    try {
      // Create recurring reminder
      const response = await fetch('/api/recurring-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedParent.id || selectedParent._id,
          type: 'contract_reminder',
          frequency: reminderFrequency,
          maxReminders: parseInt(reminderCount),
          program: programFilter,
          year: yearFilter,
          stopOnCompletion: true
        })
      })
      
      if (response.ok) {
        toast({
          title: "✅ Reminders Scheduled",
          description: `${reminderCount} ${reminderFrequency} reminders set for ${selectedParent.name}`,
        })
        setReminderDialogOpen(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up reminders.",
        variant: "destructive",
      })
    }
  }

  const stats = {
    total: parents.length,
    withContract: parents.filter(p => hasContract(p.id || p._id || '')).length,
    missing: parents.filter(p => !hasContract(p.id || p._id || '')).length
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
        <Card className="border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">
                  <FileSignature className="h-4 w-4 mr-2" />
                  Contract Management
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Program Contracts</h1>
                <p className="text-white/80">
                  Send, track, and manage contracts for all parents in each program
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={fetchData} 
                  variant="outline" 
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button asChild className="bg-white text-indigo-600 hover:bg-indigo-50">
                  <Link href={`/contracts/upload?program=${programFilter}&year=${yearFilter}`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Manual Upload
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program & Year Selector */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Program / Season</Label>
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[150px]">
                <Label className="text-sm font-medium mb-2 block">Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Search Parents</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing contracts for <span className="font-semibold text-foreground">{PROGRAMS.find(p => p.id === programFilter)?.name}</span> - <span className="font-semibold text-foreground">{yearFilter}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Parents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.withContract}</p>
                <p className="text-sm text-muted-foreground">Contracts Received</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.missing}</p>
                <p className="text-sm text-muted-foreground">Missing Contracts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parent Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Parents in {PROGRAMS.find(p => p.id === programFilter)?.name} - {yearFilter}
              <Badge variant="outline" className="ml-2">{sortedParents.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedParents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No parents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term' : 'No parents are enrolled in this program yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedParents.map((parent) => {
                  const parentId = parent.id || parent._id || ''
                  const hasContractUploaded = hasContract(parentId)
                  const contract = getContractForParent(parentId)
                  
                  return (
                    <div
                      key={parentId}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        hasContractUploaded 
                          ? 'bg-green-50 border-green-300 hover:border-green-400' 
                          : 'bg-red-50 border-red-300 hover:border-red-400'
                      }`}
                    >
                      {/* Left: Parent Info */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                          hasContractUploaded ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {parent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{parent.name}</p>
                            <Badge 
                              variant={hasContractUploaded ? 'default' : 'destructive'}
                              className={hasContractUploaded ? 'bg-green-600' : ''}
                            >
                              {hasContractUploaded ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Contract Received
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Missing Contract
                                </>
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {parent.email}
                            </span>
                            {parent.phone && (
                              <span>• {parent.phone}</span>
                            )}
                          </div>
                          {contract?.signedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Signed on {new Date(contract.signedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-full"
                        >
                          <Link href={`/parents/${parentId}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Profile
                          </Link>
                        </Button>
                        
                        {!hasContractUploaded && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => handleOpenSendDialog(parent)}
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI Send Contract
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => {
                                setSelectedParent(parent)
                                setReminderDialogOpen(true)
                              }}
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              Set Reminder
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          className={`rounded-full ${hasContractUploaded ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                          onClick={() => window.open(`/contracts/upload?parentId=${parentId}&program=${programFilter}&year=${yearFilter}`, '_blank')}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {hasContractUploaded ? 'Re-upload' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Contract Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Send Contract to {selectedParent?.name}
            </DialogTitle>
            <DialogDescription>
              Generate an AI-powered contract email with e-signature link
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{selectedParent?.email}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contract Email Content</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAIContract}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={contractMessage}
                onChange={(e) => setContractMessage(e.target.value)}
                placeholder="Click 'Generate with AI' to create a professional contract email, or type your own message..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The "[SIGN CONTRACT ONLINE]" placeholder will be replaced with a clickable button 
                that links to your e-signature form when sent.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendContract} 
              disabled={sending || !contractMessage}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Contract
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Setup Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Set Contract Reminders
            </DialogTitle>
            <DialogDescription>
              Automatically remind {selectedParent?.name} to submit their contract
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reminder Frequency</Label>
              <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="every-other-day">Every Other Day</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Number of Reminders</Label>
              <Select value={reminderCount} onValueChange={setReminderCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 reminder</SelectItem>
                  <SelectItem value="2">2 reminders</SelectItem>
                  <SelectItem value="3">3 reminders</SelectItem>
                  <SelectItem value="5">5 reminders</SelectItem>
                  <SelectItem value="10">10 reminders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <Clock className="h-4 w-4 inline mr-1" />
                Reminders will automatically stop once the contract is received.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetupReminder} className="bg-orange-600 hover:bg-orange-700">
              <Bell className="h-4 w-4 mr-2" />
              Set Reminders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppLayout>
  )
}
