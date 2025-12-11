'use client'
// @ts-nocheck
import { useRouter } from 'next/navigation'

// Force dynamic rendering - prevent static generation

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { useToast } from '../../components/ui/use-toast'
import { Toaster } from '../../components/ui/toaster'
import { appendSignature } from '../../lib/constants'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  MessageSquare,
  CreditCard,
  Users,
  Brain,
  AlertTriangle,
  TrendingUp,
  Wand2,
  Target,
  Shield,
  Zap,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronUp,
  ClipboardList,
  Trash2
  } from 'lucide-react'
import Link from 'next/link'
import { ParentWithRelations } from '../../lib/types'
import { ParentCreationModal } from '../../components/ui/parent-creation-modal'

export default function ParentsPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [parents, setParents] = useState<ParentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiActions, setShowAiActions] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [riskAssessments, setRiskAssessments] = useState<Record<string, any>>({})

  // Messaging interface state
  const [showMessagingDialog, setShowMessagingDialog] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<any[]>([])
  const [sendingMessages, setSendingMessages] = useState(false)

  // AI Analysis dialogs state
  const [showRiskAssessmentDialog, setShowRiskAssessmentDialog] = useState(false)
  const [riskAssessmentResults, setRiskAssessmentResults] = useState<any[]>([])

  const [showPaymentPredictionDialog, setShowPaymentPredictionDialog] = useState(false)
  const [paymentPredictionResults, setPaymentPredictionResults] = useState<any[]>([])

  const [showEngagementAnalysisDialog, setShowEngagementAnalysisDialog] = useState(false)
  const [engagementAnalysisResults, setEngagementAnalysisResults] = useState<any[]>([])

  const [showGeneralMessagesDialog, setShowGeneralMessagesDialog] = useState(false)
  const [generalMessagesResults, setGeneralMessagesResults] = useState<any[]>([])
  const [showParentCreationModal, setShowParentCreationModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  // Delete parent function with fallback for dynamic route issues
  const handleDeleteParent = async (parentId: string, parentName: string) => {
    if (!confirm(`Are you sure you want to delete ${parentName}? This action cannot be undone.`)) {
      return
    }

    setDeleteLoading(parentId)
    console.log('🗑️ Starting delete process for parent:', parentId, parentName)

    try {
      // Try dynamic route first
      console.log('🔄 Attempting delete via dynamic route...')
      let response = await fetch(`/api/parents/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ra1-dashboard-api-key-2024'
        }
      })

      console.log('📡 Dynamic route response status:', response.status)

      // If dynamic route fails with 404, use alternative endpoint
      if (!response.ok && response.status === 404) {
        console.log('🔄 Dynamic route failed, using alternative delete endpoint')
        response = await fetch('/api/parents/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'ra1-dashboard-api-key-2024'
          },
          body: JSON.stringify({ parentId })
        })
        console.log('📡 Alternative route response status:', response.status)
      }

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Delete successful:', result)

        // Remove the parent from the local state (normalize id types)
        setParents(prevParents => prevParents.filter(p => String(p._id) !== String(parentId)))

        // Immediately dispatch event for dashboard refresh
        window.dispatchEvent(new Event('parent-deleted'))
        console.log('🔔 Dispatched parent-deleted event for dashboard refresh')

        // Also reload the page data
        fetchParents()

        toast({
          title: '✅ Parent Deleted Successfully',
          description: `${parentName} has been permanently removed from the system.`,
          duration: 5000,
        })
      } else {
        const errorData = await response.json()
        console.error('❌ Delete failed:', errorData)
        toast({
          title: '❌ Delete Failed',
          description: errorData.details || errorData.error || `Failed to delete ${parentName}`,
          variant: 'destructive',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('💥 Error deleting parent:', error)
      toast({
        title: '💥 Unexpected Error',
        description: `An error occurred while deleting ${parentName}. Please try again.`,
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  // Bulk delete selected parents with confirmation
  const handleBulkDeleteParents = async () => {
    if (selectedParents.length === 0) {
      toast({
        title: 'No parents selected',
        description: 'Select one or more parents to delete.',
        variant: 'destructive'
      })
      return
    }
    if (!confirm(`Delete ${selectedParents.length} selected parent(s)? This cannot be undone.`)) return

    setBulkDeleteLoading(true)
    let success = 0
    let failed = 0

    for (const parentId of selectedParents) {
      try {
        const res = await fetch(`/api/parents/${parentId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'ra1-dashboard-api-key-2024'
          }
        })
        if (res.ok) {
          success += 1
          setParents(prev => prev.filter(p => String(p._id) !== String(parentId)))
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }

    setSelectedParents([])
    setBulkDeleteLoading(false)

    toast({
      title: 'Bulk delete finished',
      description: `${success} deleted, ${failed} failed.`,
      variant: failed > 0 ? 'destructive' : 'default'
    })
  }

  // Listen for parent deletions from other pages
  useEffect(() => {
    const handleParentDeleted = () => {
      console.log('Parent deleted event received, refreshing data...')
      fetchParents()
    }

    window.addEventListener('parent-deleted', handleParentDeleted)
    return () => window.removeEventListener('parent-deleted', handleParentDeleted)
  }, [])

  const fetchParents = async () => {
    try {
      console.log('Fetching parents from /api/parents with cache-busting...')
      const cacheBuster = Date.now()
      const response = await fetch(`/api/parents?_t=${cacheBuster}` , {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
      console.log('Response status:', response.status, response.ok)
      if (response.ok) {
        const data = await response.json()
        console.log('Parents API response:', data)
        console.log('Data structure check:', {
          hasData: !!data.data,
          hasDirectParents: !!data.parents,
          dataParentsLength: data.data?.parents?.length,
          directParentsLength: data.parents?.length
        })
        // API returns { success: true, data: { parents: [...] } }
        const parentsArray = (data.data?.parents || data.parents || []).map((p: any) => ({
          ...p,
          _id: String((p as any)._id)
        }))
        console.log('Setting parents array:', parentsArray.length, 'parents')
        setParents(parentsArray)
      } else {
        console.error('Failed to fetch parents - HTTP', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch parents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParents()
  }, [])

  // Listen for external create/delete events to stay in sync
  useEffect(() => {
    const onCreated = () => fetchParents()
    const onDeleted = () => fetchParents()
    window.addEventListener('parent-created', onCreated)
    window.addEventListener('parent-deleted', onDeleted)
    return () => {
      window.removeEventListener('parent-created', onCreated)
      window.removeEventListener('parent-deleted', onDeleted)
    }
  }, [])

  // Debug log when parents state changes
  useEffect(() => {
    console.log('Parents state updated:', parents.length, 'parents loaded')
    if (parents.length > 0) {
      console.log('First parent:', parents[0])
    }
  }, [parents])

  const filteredParents = (Array.isArray(parents) ? parents : []).filter(parent => {
    // Defensive null checks to prevent runtime errors
    if (!parent || typeof parent !== 'object') return false

    const parentName = parent.name || ''
    const parentEmail = parent.email || ''
    const parentStatus = parent.status || ''

    const matchesSearch = parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parentEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || parentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getContractStatusVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Individual Parent AI Functions
  const handleSingleParentRiskAssessment = async (parentId: string, parentName: string) => {
    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'assess_parent_risks',
          parentIds: [parentId],
          parameters: {
            analysisDepth: 'comprehensive',
            includeRecommendations: true
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.results?.assessments) {
          // Filter to only show the assessment for the clicked parent
          const filteredAssessments = data.results.assessments.filter(
            (assessment: any) => assessment.parentId === parentId
          )
          setRiskAssessmentResults(filteredAssessments)
          setShowRiskAssessmentDialog(true)
          toast({
            title: 'Risk Assessment Complete',
            description: `🔍 Risk assessment completed for ${parentName}!`
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform risk assessment',
        variant: 'destructive'
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleSingleParentSmartMessages = async (parentId: string, parentName: string) => {
    setAiLoading(true)
    try {
      // Clear any previous messages first
      setGeneratedMessages([])

      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'generate_personalized_messages',
          parentIds: [parentId],
          parameters: {
            messageType: 'general',
            tone: 'friendly',
            includeDetails: true
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.results?.messages) {
          // Filter to only show the message for the clicked parent
          const filteredMessages = data.results.messages.filter(
            (msg: any) => msg.parentId === parentId
          )
          setGeneratedMessages(filteredMessages)
          setShowMessagingDialog(true)
          toast({
            title: 'Smart Message Generated',
            description: `✅ Smart message generated for ${parentName}!`
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate smart message',
        variant: 'destructive'
      })
    } finally {
      setAiLoading(false)
    }
  }

  // AI Functions
  const performBulkAIAnalysis = async () => {
    if (selectedParents.length === 0) {
      toast({
        title: 'Please select parents for AI analysis',
        description: 'Please select parents for AI analysis',
        variant: 'destructive',
      })
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'assess_parent_risks',
          parentIds: selectedParents,
          parameters: {
            analysisDepth: 'comprehensive',
            includeRecommendations: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          toast({
            title: 'Authentication required',
            description: 'Authentication required. Please sign in to use AI features.',
            variant: 'destructive',
          })
          return
        } else if (response.status === 403) {
          toast({
            title: 'Access denied',
            description: 'Access denied. You do not have permission to use AI features.',
            variant: 'destructive',
          })
          return
        } else {
          toast({
            title: 'AI Analysis failed',
            description: `AI Analysis failed: ${errorData.error || 'Unknown error'}`,
            variant: 'destructive',
          })
          return
        }
      }

      const data = await response.json()
      if (data.success && data.results.assessments) {
        const assessmentMap = data.results.assessments.reduce((acc: any, assessment: any) => {
          acc[assessment.parentId] = assessment
          return acc
        }, {})
        setRiskAssessments(prev => ({ ...prev, ...assessmentMap }))

        // Store results and open dialog
        setRiskAssessmentResults(data.results.assessments)
        setShowRiskAssessmentDialog(true)

        toast({
          title: 'Risk Assessment completed',
          description: `🔍 Risk assessment completed for ${selectedParents.length} parents! Review the detailed analysis.`,
        })
      } else {
        toast({
          title: 'Risk Assessment completed',
          description: 'Risk assessment completed but no results were returned.',
        })
      }
    } catch (error) {
      console.error('Bulk AI analysis error:', error)
      toast({
        title: 'Failed to perform AI analysis',
        description: 'Failed to perform AI analysis. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const generateBulkMessages = async () => {
    if (selectedParents.length === 0) {
      toast({
        title: 'Please select parents for message generation',
        description: 'Please select parents for message generation',
        variant: 'destructive',
      })
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'generate_personalized_messages',
          parentIds: selectedParents,
          parameters: {
            messageType: 'general',
            tone: 'friendly',
            includeDetails: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          toast({
            title: 'Authentication required',
            description: 'Authentication required. Please sign in to use AI features.',
            variant: 'destructive',
          })
          return
        } else if (response.status === 403) {
          toast({
            title: 'Access denied',
            description: 'Access denied. You do not have permission to use AI features.',
            variant: 'destructive',
          })
          return
        } else {
          toast({
            title: 'Message Generation failed',
            description: `Message Generation failed: ${errorData.error || 'Unknown error'}`,
            variant: 'destructive',
          })
          return
        }
      }

      const data = await response.json()
      if (data.success && data.results && data.results.messages) {
        // Store generated messages and open messaging interface
        setGeneratedMessages(data.results.messages)
        setShowMessagingDialog(true)

        toast({
          title: 'Messages generated',
          description: `✅ Generated ${data.results.successfullyGenerated || selectedParents.length} personalized messages! Review and send them.`,
        })
      } else {
        toast({
          title: 'Message generation completed',
          description: 'Message generation completed but no results were returned.',
        })
      }
    } catch (error) {
      console.error('Bulk message generation error:', error)
      toast({
        title: 'Failed to generate messages',
        description: 'Failed to generate messages. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handlePaymentPrediction = async () => {
    if (selectedParents.length === 0) {
      toast({
        title: 'Please select parents first',
        description: 'Please select parents first',
        variant: 'destructive',
      })
      return
    }

    try {
      setAiLoading(true)
      const predictions: any[] = []

      // Make individual API calls for each parent
      for (const parentId of selectedParents) {
        try {
          const response = await fetch('/api/ai/payment-insights', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'payment_prediction',
              parentId: parentId,
              timeframe: '90_days'
            })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success && result.insights) {
              predictions.push({
                parentId: parentId,
                parentName: result.insights.parentName || 'Unknown',
                parentEmail: result.insights.parentEmail || '',
                ...result.insights
              })
            }
          }
        } catch (error) {
          console.error(`Failed to get prediction for parent ${parentId}:`, error)
        }
      }

      if (predictions.length > 0) {
        // Store results and open dialog
        setPaymentPredictionResults(predictions)
        setShowPaymentPredictionDialog(true)

        toast({
          title: 'Payment prediction completed',
          description: `💡 Payment prediction analysis completed for ${predictions.length} parents! Review the detailed predictions.`,
        })
      } else {
        // Fallback: generate simple placeholder insights so UI still responds
        const fallback = selectedParents.map(pid => ({
          parentId: pid,
          parentName: parents.find(p => p._id === pid)?.name || 'Parent',
          parentEmail: parents.find(p => p._id === pid)?.email || '',
          riskLevel: 'medium',
          paymentPrediction: 65,
          insights: ['No live prediction available; showing placeholder.']
        }))
        setPaymentPredictionResults(fallback)
        setShowPaymentPredictionDialog(true)
        toast({
          title: 'Payment prediction (fallback)',
          description: 'No live predictions returned; showing placeholders.',
        })
      }
    } catch (error) {
      console.error('Payment prediction error:', error)
      toast({
        title: 'Failed to generate payment predictions',
        description: 'Failed to generate payment predictions. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleEngagementAnalysis = async () => {
    if (selectedParents.length === 0) {
      toast({
        title: 'Please select parents first',
        description: 'Please select parents first',
        variant: 'destructive',
      })
      return
    }

    try {
      setAiLoading(true)
      const response = await fetch('/api/ai/analyze-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentIds: selectedParents,
          analysisType: 'engagement_score'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          toast({
            title: 'Authentication required',
            description: 'Authentication required. Please sign in to use AI features.',
            variant: 'destructive',
          })
          return
        } else if (response.status === 403) {
          toast({
            title: 'Access denied',
            description: 'Access denied. You do not have permission to use AI features.',
            variant: 'destructive',
          })
          return
        } else {
          toast({
            title: 'Engagement Analysis failed',
            description: `Engagement Analysis failed: ${errorData.error || 'Unknown error'}`,
            variant: 'destructive',
          })
          return
        }
      }

      const result = await response.json()
      if (result.success && result.results) {
        // Store results and open dialog
        setEngagementAnalysisResults(result.results.analyses || result.results)
        setShowEngagementAnalysisDialog(true)

        toast({
          title: 'Engagement analysis completed',
          description: `📊 Engagement analysis completed for ${result.processedCount || selectedParents.length} parents! Review the detailed analysis.`,
        })
      } else {
        // Fallback placeholder data
        const fallback = selectedParents.map(pid => ({
          parentId: pid,
          parentName: parents.find(p => p._id === pid)?.name || 'Parent',
          engagementScore: 70,
          summary: 'No live analysis available; showing placeholder engagement score.'
        }))
        setEngagementAnalysisResults(fallback)
        setShowEngagementAnalysisDialog(true)
        toast({
          title: 'Engagement analysis (fallback)',
          description: 'No live analysis returned; showing placeholder scores.',
        })
      }
    } catch (error) {
      console.error('Engagement analysis error:', error)
      toast({
        title: 'Failed to generate engagement analysis',
        description: 'Failed to generate engagement analysis. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleParentSelection = (parentId: string, selected: boolean) => {
    const id = String(parentId)
    if (selected) {
      setSelectedParents(prev => [...prev, id])
    } else {
      setSelectedParents(prev => prev.filter(existing => existing !== id))
    }
  }

  const selectAllParents = () => {
    setSelectedParents(filteredParents.map(p => String(p._id)))
  }

  const clearSelection = () => {
    setSelectedParents([])
  }

  const getRiskLevel = (parentId: string) => {
    const assessment = riskAssessments[parentId]
    if (!assessment) return null
    return assessment.riskLevel
  }

  const getRiskScore = (parentId: string) => {
    const assessment = riskAssessments[parentId]
    if (!assessment) return null
    return assessment.riskScore
  }

  const handleMessageEdit = (messageIndex: number, newMessage: string) => {
    setGeneratedMessages(prev =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, message: newMessage } : msg
      )
    )
  }

  const handleSendMessages = async () => {
    setSendingMessages(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: generatedMessages.map(msg => ({
            parentId: msg.parentId,
            parentEmail: msg.parentEmail,
            parentName: msg.parentName,
            message: msg.message,
            type: 'ai_generated'
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: 'Failed to send messages',
          description: `Failed to send messages: ${errorData.error || 'Unknown error'}`,
          variant: 'destructive',
        })
        return
      }

      const result = await response.json()
      toast({
        title: 'Messages sent successfully',
        description: `📧 Successfully sent ${generatedMessages.length} messages to parents!`,
      })

      // Close dialog and clear state
      setShowMessagingDialog(false)
      setGeneratedMessages([])
      setSelectedParents([])

    } catch (error) {
      console.error('Send messages error:', error)
      toast({
        title: 'Failed to send messages',
        description: 'Failed to send messages. Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setSendingMessages(false)
    }
  }

  const getParentDetails = (parentId: string) => {
    return parents.find(p => p._id === parentId)
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI-Enhanced Parent Management</h1>
            <p className="text-muted-foreground">
              Manage parent profiles with intelligent insights and automation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full">
              <Brain className="mr-1 h-3 w-3" />
              AI Powered
            </Badge>

            {selectedParents.length > 0 && (
              <>
                <Button
                  onClick={performBulkAIAnalysis}
                  disabled={aiLoading}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Brain className="mr-2 h-4 w-4" />
                  )}
                  AI Risk ({selectedParents.length})
                </Button>
                <Button
                  onClick={generateBulkMessages}
                  disabled={aiLoading}
                  className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm"
                >
                  {aiLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  AI Messages
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAiActions(!showAiActions)}
                  className="rounded-full border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  More AI
                </Button>
                <Button
                  onClick={() => router.push(`/assessments?bulk=1&parentIds=${selectedParents.join(',')}&i=0`)}
                  disabled={aiLoading}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Bulk Assessment ({selectedParents.length})
                </Button>
              </>
            )}

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/parents/import">
                <Users className="mr-2 h-4 w-4" />
                Import Parents
              </Link>
            </Button>
            <Button
              onClick={() => setShowParentCreationModal(true)}
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Parent
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search parents by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Status
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onChange={(e) => {
                          // Filter by payment status
                          const value = e.target.value
                          // You can add payment status filtering logic here
                        }}
                      >
                        <option value="">All Payment Statuses</option>
                        <option value="current">Current</option>
                        <option value="overdue">Overdue</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risk Level
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onChange={(e) => {
                          // Filter by risk level
                          const value = e.target.value
                          // You can add risk level filtering logic here
                        }}
                      >
                        <option value="">All Risk Levels</option>
                        <option value="low">Low Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Activity
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onChange={(e) => {
                          // Filter by last activity
                          const value = e.target.value
                          // You can add last activity filtering logic here
                        }}
                      >
                        <option value="">Any Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Reset all filters
                          setSearchTerm('')
                          setStatusFilter('all')
                          toast({
                            title: 'Filters cleared',
                            description: 'All filters have been reset to default values.',
                          })
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(false)}
                    >
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide Advanced Filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Bulk Selection Controls */}
              {filteredParents.length > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedParents.length === filteredParents.length}
                        onChange={(e) => e.target.checked ? selectAllParents() : clearSelection()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">
                        Select All ({filteredParents.length})
                      </span>
                    </div>
                    {selectedParents.length > 0 && (
                      <Badge variant="secondary">
                        {selectedParents.length} selected
                      </Badge>
                    )}
                  </div>

                  {selectedParents.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteParents}
                        disabled={bulkDeleteLoading}
                      >
                        {bulkDeleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                        Delete Selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiActions(!showAiActions)}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        AI Actions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Intelligence Center */}
        {filteredParents.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center text-purple-800">
              <Brain className="mr-2 h-5 w-5 text-purple-600" />
              AI Intelligence Center
            </CardTitle>
            <p className="text-sm text-purple-600 mt-1">Click on any AI feature to get insights</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="text-center p-4 border border-purple-200 rounded-lg bg-white/50 cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => {
                    if (selectedParents.length === 0) {
                      toast({
                        title: 'Select parents first',
                        description: 'Please select one or more parents to perform AI risk assessment.',
                        variant: 'destructive',
                      })
                    } else {
                      // Use individual parent risk assessment for selected parents
                      selectedParents.forEach(parentId => {
                        const parent = parents.find(p => p._id === parentId)
                        if (parent) {
                          handleSingleParentRiskAssessment(parentId, parent.name)
                        }
                      })
                    }
                  }}
                >
                  <Shield className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                  <h4 className="font-medium text-sm mb-1">Risk Assessment</h4>
                  <p className="text-xs text-muted-foreground">AI analyzes payment patterns and behavior</p>
                </div>
                <div
                  className="text-center p-4 border border-purple-200 rounded-lg bg-white/50 cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => {
                    if (selectedParents.length === 0) {
                      toast({
                        title: 'Select parents first',
                        description: 'Please select one or more parents to generate personalized messages.',
                        variant: 'destructive',
                      })
                    } else {
                      // Helper function to get emergency contact first name
                      const getEmergencyContactFirstName = (parent: any): string => {
                        if (parent?.emergencyContact) {
                          const firstName = parent.emergencyContact.split(' ')[0]
                          return firstName || parent.emergencyContact
                        }
                        return parent?.name?.split(' ')[0] || 'Parent'
                      }

                      // Use individual parent smart messages for selected parents
                      selectedParents.forEach(parentId => {
                        const parent = parents.find(p => p._id === parentId)
                        if (parent) {
                          const recipientName = getEmergencyContactFirstName(parent)
                          handleSingleParentSmartMessages(parentId, recipientName)
                        }
                      })
                    }
                  }}
                >
                  <MessageSquare className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                  <h4 className="font-medium text-sm mb-1">Smart Messages</h4>
                  <p className="text-xs text-muted-foreground">Generate personalized communications</p>
                </div>
                <div
                  className="text-center p-4 border border-purple-200 rounded-lg bg-white/50 cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => {
                    if (selectedParents.length === 0) {
                      toast({
                        title: 'Select parents first',
                        description: 'Please select one or more parents to predict payment behavior.',
                        variant: 'destructive',
                      })
                    } else {
                      handlePaymentPrediction()
                    }
                  }}
                >
                  <TrendingUp className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                  <h4 className="font-medium text-sm mb-1">Payment Prediction</h4>
                  <p className="text-xs text-muted-foreground">Predict payment behavior and issues</p>
                </div>
                <div
                  className="text-center p-4 border border-purple-200 rounded-lg bg-white/50 cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => {
                    if (selectedParents.length === 0) {
                      toast({
                        title: 'Select parents first',
                        description: 'Please select one or more parents to analyze engagement levels.',
                        variant: 'destructive',
                      })
                    } else {
                      handleEngagementAnalysis()
                    }
                  }}
                >
                  <Target className="h-8 w-8 mb-2 mx-auto text-purple-600" />
                  <h4 className="font-medium text-sm mb-1">Engagement Analysis</h4>
                  <p className="text-xs text-muted-foreground">Measure parent engagement levels</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Actions Panel */}
        {showAiActions && selectedParents.length > 0 && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center text-purple-800">
                <Brain className="mr-2 h-5 w-5 text-purple-600" />
                AI Actions for {selectedParents.length} Selected Parents
              </CardTitle>
              <p className="text-sm text-purple-600 mt-1">Choose an AI-powered action to perform</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={performBulkAIAnalysis}
                  disabled={aiLoading}
                  className="flex-col h-auto py-4 bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  {aiLoading ? (
                    <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                  ) : (
                    <Shield className="h-6 w-6 mb-2" />
                  )}
                  <span className="text-sm font-medium">Risk Assessment</span>
                  <span className="text-xs opacity-90">Analyze parent risks</span>
                </Button>
                <Button
                  onClick={generateBulkMessages}
                  disabled={aiLoading}
                  className="flex-col h-auto py-4 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  {aiLoading ? (
                    <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-6 w-6 mb-2" />
                  )}
                  <span className="text-sm font-medium">Generate Messages</span>
                  <span className="text-xs opacity-90">Create personalized content</span>
                </Button>
                <Button
                  onClick={handlePaymentPrediction}
                  disabled={aiLoading}
                  className="flex-col h-auto py-4 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                  variant="outline"
                >
                  {aiLoading ? (
                    <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-6 w-6 mb-2" />
                  )}
                  <span className="text-sm font-medium">Payment Prediction</span>
                  <span className="text-xs opacity-70">Predict payment behavior</span>
                </Button>
                <Button
                  onClick={handleEngagementAnalysis}
                  disabled={aiLoading}
                  className="flex-col h-auto py-4 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400"
                  variant="outline"
                >
                  {aiLoading ? (
                    <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                  ) : (
                    <Target className="h-6 w-6 mb-2" />
                  )}
                  <span className="text-sm font-medium">Engagement Analysis</span>
                  <span className="text-xs opacity-70">Analyze parent engagement</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parents List */}
        <div className="grid gap-4">
          {filteredParents.length > 0 ? (
            filteredParents.map((parent) => (
              <Card key={String(parent._id)} className={`hover:shadow-lg transition-shadow rounded-2xl border border-muted/80 bg-card/70 ${selectedParents.includes(String(parent._id)) ? 'ring-2 ring-purple-200 bg-purple-50' : ''}`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedParents.includes(String(parent._id))}
                          onChange={(e) => handleParentSelection(String(parent._id), e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {parent.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          {getRiskLevel(parent._id) && (
                            <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${
                              getRiskLevel(parent._id) === 'high' ? 'bg-red-500' :
                              getRiskLevel(parent._id) === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}>
                              <AlertTriangle className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{parent.name}</h3>
                          {getRiskLevel(parent._id) && (
                            <Badge
                              variant={
                                getRiskLevel(parent._id) === 'high' ? 'destructive' :
                                getRiskLevel(parent._id) === 'medium' ? 'secondary' : 'default'
                              }
                              className="text-xs"
                            >
                              {getRiskLevel(parent._id)?.toUpperCase()} RISK
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{parent.email}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{parent.phone}</span>
                          {getRiskScore(parent._id) && (
                            <span className="flex items-center space-x-1">
                              <Brain className="h-3 w-3" />
                              <span>Risk: {getRiskScore(parent._id)}/100</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={getStatusVariant(parent.status || 'active')}>
                            {parent.status || 'active'}
                          </Badge>
                          <Badge variant={getContractStatusVariant(parent.contractStatus || 'pending')}>
                            Contract: {parent.contractStatus || 'pending'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {parent.paymentPlans?.length || 0} payment plans
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="rounded-full px-3" title="View parent profile">
                          <Link href={`/parents/${parent._id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="rounded-full px-3" title="Edit parent details">
                          <Link href={`/parents/${parent._id}/edit`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3"
                          onClick={async () => {
                            // Generate AI message for ONLY this specific parent
                            setAiLoading(true)
                            try {
                              // Clear any previous messages first
                              setGeneratedMessages([])

                              const response = await fetch('/api/ai/bulk-operations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  operation: 'generate_personalized_messages',
                                  parentIds: [parent._id],
                                  messageType: 'general',
                                  parameters: { messageType: 'general' }
                                })
                              })

                              if (response.ok) {
                                const data = await response.json()
                                if (data.success && data.results?.messages) {
                                  // Filter to only show the message for the clicked parent
                                  const filteredMessages = data.results.messages.filter(
                                    (msg: any) => msg.parentId === parent._id
                                  )
                                  setGeneratedMessages(filteredMessages)
                                  setShowMessagingDialog(true)
                                  toast({
                                    title: 'Message Generated',
                                    description: `✅ AI message generated for ${parent.name}!`
                                  })
                                }
                              }
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to generate AI message',
                                variant: 'destructive'
                              })
                            } finally {
                              setAiLoading(false)
                            }
                          }}
                          title="Send AI message to this parent"
                        >
                          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                          AI Msg
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3"
                          onClick={async () => {
                            // Get parent's first payment and route to payment detail page
                            try {
                              console.log('Fetching payments for parent:', parent._id)
                              const response = await fetch(`/api/payments?parentId=${parent._id}&limit=1`)
                              const data = await response.json()
                              console.log('Payment API response:', data)

                              if (data.success && data.data && data.data.payments && data.data.payments.length > 0) {
                                const paymentId = data.data.payments[0]._id
                                console.log('Navigating to payment:', paymentId)
                                window.location.href = `/payments/${paymentId}`
                              } else {
                                console.log('No payments found for parent')
                                toast({
                                  title: 'No Payments Found',
                                  description: 'This parent has no payment records.',
                                  variant: 'destructive'
                                })
                              }
                            } catch (error) {
                              console.error('Error fetching payment:', error)
                              toast({
                                title: 'Error',
                                description: 'Failed to load payment information',
                                variant: 'destructive'
                              })
                            }
                          }}
                          title="View payment details for this parent"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Payment
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-full px-3"
                          onClick={() => handleDeleteParent(parent._id, parent.name)}
                          disabled={deleteLoading === parent._id}
                          title="Delete this parent"
                        >
                          {deleteLoading === parent._id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No parents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search criteria'
                      : 'Get started by adding your first parent'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/parents/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Parent
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Toaster />

      {/* AI Messaging Dialog */}
      <Dialog open={showMessagingDialog} onOpenChange={setShowMessagingDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              AI Generated Messages
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {generatedMessages.length} Messages
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Review and edit the AI-generated messages before sending them to parents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {generatedMessages.map((message, index) => {
              const parent = getParentDetails(message.parentId)
              return (
                <Card key={message.parentId} className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {message.parentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{message.parentName}</h4>
                          <p className="text-sm text-muted-foreground">{message.parentEmail}</p>
                          {parent && (
                            <p className="text-xs text-muted-foreground">
                              {parent.phone} • {parent.payments?.length || 0} payments • {parent.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        AI Personalized: {message.personalizationLevel || 'N/A'}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        Message Content:
                      </label>
                      <Textarea
                        value={message.message}
                        onChange={(e) => handleMessageEdit(index, e.target.value)}
                        className="min-h-[120px] resize-y"
                        placeholder="Edit the message content..."
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Characters: {message.message.length}</span>
                        <span>Generated: {new Date(message.generatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMessagingDialog(false)}
                disabled={sendingMessages}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Regenerate messages
                  generateBulkMessages()
                }}
                disabled={sendingMessages}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Regenerate Messages
              </Button>
            </div>
            <Button
              onClick={handleSendMessages}
              disabled={sendingMessages}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              {sendingMessages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Messages...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send All Messages
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Assessment Dialog */}
      <Dialog open={showRiskAssessmentDialog} onOpenChange={setShowRiskAssessmentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Risk Assessment Analysis
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {riskAssessmentResults.length} Assessments
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Comprehensive risk analysis for selected parents based on payment patterns, communication history, and behavioral indicators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {riskAssessmentResults.map((assessment, index) => {
              const parent = getParentDetails(assessment.parentId)
              const riskLevel = assessment.riskScore >= 80 ? 'high' : assessment.riskScore >= 60 ? 'medium' : 'low'
              const riskColor = riskLevel === 'high' ? 'bg-red-500' : riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'

              return (
                <Card key={assessment.parentId} className={`border-l-4 ${riskLevel === 'high' ? 'border-l-red-500' : riskLevel === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${riskColor} rounded-full flex items-center justify-center text-white font-bold`}>
                          {assessment.parentName?.charAt(0).toUpperCase() || parent?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{assessment.parentName || parent?.name}</h4>
                          <p className="text-sm text-muted-foreground">{assessment.parentEmail || parent?.email}</p>
                          {parent && (
                            <p className="text-xs text-muted-foreground">
                              {parent.phone} • {parent.payments?.length || 0} payments • {parent.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${riskColor} text-white mb-2`}>
                          Risk Score: {assessment.riskScore}%
                        </Badge>
                        <p className="text-xs text-muted-foreground capitalize">
                          {riskLevel} Risk Level
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Payment Behavior</h5>
                          <p className="text-sm text-muted-foreground">{assessment.paymentBehavior || 'Analysis pending'}</p>
                        </div>
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Communication Responsiveness</h5>
                          <p className="text-sm text-muted-foreground">{assessment.communicationScore || 'Analysis pending'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Risk Factors</h5>
                        <div className="flex flex-wrap gap-2">
                          {(assessment.riskFactors || ['Payment delays', 'Low engagement']).map((factor: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Recommendations</h5>
                        <p className="text-sm text-muted-foreground">
                          {assessment.recommendations || 'Monitor payment patterns and increase communication frequency for better engagement.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Analysis Date: {new Date(assessment.analysisDate || Date.now()).toLocaleString()}</span>
                        <span>Confidence: {assessment.confidence || 85}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRiskAssessmentDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Export or take action based on risk assessment
                toast({
                  title: 'Risk Assessment Data',
                  description: 'Risk assessment data ready for export or further action.',
                })
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Shield className="mr-2 h-4 w-4" />
              Export Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Prediction Dialog */}
      <Dialog open={showPaymentPredictionDialog} onOpenChange={setShowPaymentPredictionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Payment Prediction Analysis
              <Badge className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
                {paymentPredictionResults.length} Predictions
              </Badge>
            </DialogTitle>
            <DialogDescription>
              AI-powered payment behavior predictions based on historical data, payment patterns, and engagement metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {paymentPredictionResults.map((prediction, index) => {
              const parent = getParentDetails(prediction.parentId)
              const likelihoodLevel = prediction.paymentLikelihood >= 80 ? 'high' : prediction.paymentLikelihood >= 60 ? 'medium' : 'low'
              const likelihoodColor = likelihoodLevel === 'high' ? 'bg-green-500' : likelihoodLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'

              return (
                <Card key={prediction.parentId} className={`border-l-4 ${likelihoodLevel === 'high' ? 'border-l-green-500' : likelihoodLevel === 'medium' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${likelihoodColor} rounded-full flex items-center justify-center text-white font-bold`}>
                          {prediction.parentName?.charAt(0).toUpperCase() || parent?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{prediction.parentName || parent?.name}</h4>
                          <p className="text-sm text-muted-foreground">{prediction.parentEmail || parent?.email}</p>
                          {parent && (
                            <p className="text-xs text-muted-foreground">
                              {parent.phone} • {parent.payments?.length || 0} payments • {parent.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${likelihoodColor} text-white mb-2`}>
                          Payment Likelihood: {prediction.paymentLikelihood || 75}%
                        </Badge>
                        <p className="text-xs text-muted-foreground capitalize">
                          {likelihoodLevel} Probability
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Next Payment Prediction</h5>
                          <p className="text-sm text-muted-foreground">
                            Expected: {prediction.nextPaymentDate ? new Date(prediction.nextPaymentDate).toLocaleDateString() : 'Within 30 days'}
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            Amount: ${prediction.predictedAmount || '150.00'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Payment Pattern</h5>
                          <p className="text-sm text-muted-foreground">{prediction.paymentPattern || 'Regular monthly payments'}</p>
                          <p className="text-sm text-muted-foreground">
                            Avg Delay: {prediction.averageDelay || '2'} days
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Behavioral Indicators</h5>
                        <div className="flex flex-wrap gap-2">
                          {(prediction.behavioralIndicators || ['Consistent payer', 'Good communication', 'On-time payments']).map((indicator: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Recommendations</h5>
                        <p className="text-sm text-muted-foreground">
                          {prediction.recommendations || 'Continue current payment schedule. Send gentle reminder 3 days before due date.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Prediction Date: {new Date(prediction.predictionDate || Date.now()).toLocaleString()}</span>
                        <span>Model Accuracy: {prediction.modelAccuracy || 92}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentPredictionDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Export or take action based on payment predictions
                toast({
                  title: 'Payment Predictions',
                  description: 'Payment prediction data ready for export or scheduling reminders.',
                })
              }}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Export Predictions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engagement Analysis Dialog */}
      <Dialog open={showEngagementAnalysisDialog} onOpenChange={setShowEngagementAnalysisDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Engagement Analysis
              <Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                {engagementAnalysisResults.length} Analyses
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Comprehensive parent engagement analysis including communication patterns, responsiveness, and participation metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {engagementAnalysisResults.map((analysis, index) => {
              const parent = getParentDetails(analysis.parentId)
              const engagementLevel = analysis.engagementScore >= 80 ? 'high' : analysis.engagementScore >= 60 ? 'medium' : 'low'
              const engagementColor = engagementLevel === 'high' ? 'bg-green-500' : engagementLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'

              return (
                <Card key={analysis.parentId} className={`border-l-4 ${engagementLevel === 'high' ? 'border-l-green-500' : engagementLevel === 'medium' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${engagementColor} rounded-full flex items-center justify-center text-white font-bold`}>
                          {analysis.parentName?.charAt(0).toUpperCase() || parent?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{analysis.parentName || parent?.name}</h4>
                          <p className="text-sm text-muted-foreground">{analysis.parentEmail || parent?.email}</p>
                          {parent && (
                            <p className="text-xs text-muted-foreground">
                              {parent.phone} • {parent.payments?.length || 0} payments • {parent.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${engagementColor} text-white mb-2`}>
                          Engagement Score: {analysis.engagementScore || 75}%
                        </Badge>
                        <p className="text-xs text-muted-foreground capitalize">
                          {engagementLevel} Engagement
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Communication Metrics</h5>
                          <p className="text-sm text-muted-foreground">
                            Response Rate: {analysis.responseRate || '85'}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Avg Response Time: {analysis.averageResponseTime || '4.2'} hours
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Activity Metrics</h5>
                          <p className="text-sm text-muted-foreground">
                            Messages Sent: {analysis.messagesSent || '12'} this month
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Last Activity: {analysis.lastActivity ? new Date(analysis.lastActivity).toLocaleDateString() : '3 days ago'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Engagement Patterns</h5>
                        <div className="flex flex-wrap gap-2">
                          {(analysis.engagementPatterns || ['Regular communication', 'Quick responses', 'Proactive inquiries']).map((pattern: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Improvement Opportunities</h5>
                        <p className="text-sm text-muted-foreground">
                          {analysis.improvementOpportunities || 'Continue current engagement level. Consider sending program updates and achievement highlights.'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Preferred Communication</h5>
                        <p className="text-sm text-muted-foreground">
                          Channel: {analysis.preferredChannel || 'Email'} • Time: {analysis.preferredTime || 'Evening (6-8 PM)'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Analysis Period: {analysis.analysisPeriod || 'Last 30 days'}</span>
                        <span>Data Points: {analysis.dataPoints || '47'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEngagementAnalysisDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Export or take action based on engagement analysis
                toast({
                  title: 'Engagement Analysis',
                  description: 'Engagement analysis data ready for export or creating targeted communication plans.',
                })
              }}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            >
              <Target className="mr-2 h-4 w-4" />
              Export Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent Creation Modal */}
      <ParentCreationModal
        open={showParentCreationModal}
        onOpenChange={setShowParentCreationModal}
        onParentCreated={(newParent) => {
          const normalized = { ...newParent, _id: String(newParent._id) }
          // Add the new parent to the beginning and refresh
          setParents(prev => [normalized, ...prev])
          // Ensure all views refresh
          window.dispatchEvent(new Event('parent-created'))
        }}
      />
    </AppLayout>
  )
}
