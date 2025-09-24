// @ts-nocheck
'use client'

// Client component; no Next.js dynamic export in client files

import React, { useEffect, useState, useCallback } from 'react'
import nextDynamic from 'next/dynamic'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AIInput } from '../../components/ui/ai-input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Checkbox } from '../../components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible'
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  BarChart3,
  Mail,
  RefreshCw,
  Eye,
  Brain,
  Wand2,
  Sparkles,
  Target,
  Shield,
  User,
  Phone,
  FileText,
  Bell,
  Building2,
  GraduationCap,
  Dumbbell,
  Home,
  Settings,
  Edit,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { PaymentWithRelations, PaymentStats, PaymentAnalytics } from '../../lib/types'
import { useToast } from '../../components/ui/use-toast'
import { Toaster } from '../../components/ui/toaster'
import { ParentCreationModal } from '../../components/ui/parent-creation-modal'

// Program configuration
const PROGRAMS = [
  { id: 'yearly-program', name: 'Yearly Program' },
  { id: 'fall-aau', name: 'Fall AAU' },
  { id: 'winter-aau', name: 'Winter AAU' },
  { id: 'spring-aau', name: 'Spring AAU' },
  { id: 'summer-aau', name: 'Summer AAU' },
  { id: 'tbf-programs', name: 'TBF Programs' },
  { id: 'lane-back-menu', name: 'Lane from Kevin\'s Back Menu' },
  { id: 'kevin-lessons', name: 'Kevin Houston\'s Lessons' },
  { id: 'thos-facility', name: 'THOS Facility Rentals' }
]
// Dynamic import for charts
// @ts-ignore
const Recharts = nextDynamic(() => import('recharts'), { ssr: false, loading: () => <div>Loading chart...</div> })

export default function PaymentsPage() {
  const { toast } = useToast()
  const [activeProgram, setActiveProgram] = useState('yearly-program')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [paymentsData, setPaymentsData] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [teamsData, setTeamsData] = useState<any>(null)
  const [allParentsData, setAllParentsData] = useState<any>(null)
  const [plansTotals, setPlansTotals] = useState<{ total: number, activeParents: number } | null>(null)

  // Define fetchData as a standalone function
  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      console.log('🔄 Starting data fetch...')
      setLoading(true)
      if (isManualRefresh) {
        setRefreshing(true)
      }

      // Ultra-aggressive cache busting
      const timestamp = Date.now() + Math.random() * 10000
      const cacheKey = `cache-bust-${timestamp}`
      console.log('🔄 Fetching with cache key:', cacheKey)

      // Clear any existing cache entries
      if (typeof window !== 'undefined') {
        localStorage.removeItem('payments-cache')
        sessionStorage.removeItem('payments-cache')
      }

      const [paymentsRes, analyticsRes, teamsRes, parentsRes, plansRes] = await Promise.all([
        fetch(`/api/payments?program=${activeProgram}&limit=1000&_cache=${cacheKey}&_t=${timestamp}`, {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }),
        fetch(`/api/payments/analytics?program=${activeProgram}&_cache=${cacheKey}&_t=${timestamp}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-api-key': 'ra1-dashboard-api-key-2024'
          }
        }),
        fetch(`/api/teams?_cache=${cacheKey}&_t=${timestamp}`, {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }),
        fetch(`/api/parents?_cache=${cacheKey}&_t=${timestamp}`, {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }),
        fetch(`/api/payment-plans?_cache=${cacheKey}&_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-api-key': 'ra1-dashboard-api-key-2024'
          }
        })
      ])

      const [paymentsResult, analyticsResult, teamsResult, parentsResult, plansResult] = await Promise.all([
        paymentsRes.json(),
        analyticsRes.json(),
        teamsRes.json(),
        parentsRes.json(),
        plansRes.ok ? plansRes.json() : []
      ])

      console.log('📊 Data fetched:', {
        payments: paymentsResult.success,
        analytics: analyticsResult.success,
        teams: teamsResult.success,
        parents: parentsResult.success
      })

      if (paymentsResult.success) setPaymentsData(paymentsResult.data)
      if (analyticsResult.success) setAnalytics(analyticsResult.data)
      if (teamsResult.success) setTeamsData(teamsResult.data)
      // Compute authoritative plans total (sum of largest plan per parent),
      // filtered to parents currently present on the Parents page
      try {
        const plansArr: any[] = Array.isArray(plansResult) ? plansResult : []
        const allowedParentIds = new Set<string>(
          Array.isArray(parentsResult?.data?.parents)
            ? parentsResult.data.parents.map((p: any) => String(p._id || p.id || ''))
            : []
        )
        const countable = plansArr.filter((p: any) => {
          const status = String(p.status || '').toLowerCase()
          return status === 'active' || status === 'pending'
        })
        const planByParent: Record<string, any> = {}
        for (const plan of countable) {
          const parentKey = String(plan.parentId || '')
          const current = planByParent[parentKey]
          if (!current || Number(plan.totalAmount || 0) > Number(current.totalAmount || 0)) {
            planByParent[parentKey] = plan
          }
        }
        // Only include plans for parents that exist on the Parents page
        const uniquePlans = (Object.values(planByParent) as any[])
          .filter((p: any) => allowedParentIds.size === 0 || allowedParentIds.has(String(p.parentId || '')))
        const plansTotal = uniquePlans.reduce((s: number, p: any) => s + Number(p.totalAmount || 0), 0)
        setPlansTotals({ total: plansTotal, activeParents: uniquePlans.length })
      } catch {}
      if (parentsResult.success) {
        setAllParentsData(parentsResult.data)

        // Debug logging
        const parentCount = parentsResult.data?.parents?.length || 0
        const unassignedCount = parentsResult.data?.parents?.filter((p: any) => !p.teamId).length || 0
        console.log('🔍 PAYMENTS PAGE DEBUG:', {
          totalParents: parentCount,
          unassignedParents: unassignedCount,
          parentsWithTeams: parentCount - unassignedCount
        })

        // Show success notification with team counts
        toast({
          title: "✅ Data Refreshed Successfully",
          description: `Loaded ${parentCount} parents (${unassignedCount} unassigned) with fresh team assignments`,
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      toast({
        title: "❌ Error Loading Data",
        description: "Failed to load payment data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLastUpdated(new Date())
    }
  }, [activeProgram])

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchData(true)
  }

  // Auto-refresh every 5 minutes (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 300 * 1000) // 5 minutes instead of 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  // Listen for parent deletions from other pages
  useEffect(() => {
    const handleParentDeleted = () => {
      console.log('Parent deleted event received, refreshing data...')
      fetchData()
    }

    window.addEventListener('parent-deleted', handleParentDeleted)
    return () => window.removeEventListener('parent-deleted', handleParentDeleted)
  }, [fetchData])

  // Listen for payment plan creation events
  useEffect(() => {
    const handlePaymentPlanCreated = (event: any) => {
      const eventData = event.detail || {}
      console.log('🔄 Payment plan created event received:', eventData)
      console.log('🔄 Refreshing data for parent:', eventData.parentName || 'Unknown')

      // Add a longer delay to ensure the payment plan and payments are fully created
      setTimeout(() => {
        console.log('🔄 Fetching updated data after payment plan creation...')
        // Force aggressive cache busting for payment plan updates
        if (typeof window !== 'undefined') {
          localStorage.removeItem('payments-cache')
          sessionStorage.removeItem('payments-cache')
        }
        fetchData()
      }, 1000) // Increased delay to 1 second
    }

    window.addEventListener('payment-plan-created', handlePaymentPlanCreated)
    console.log('👂 Payment plan event listener added')
    return () => {
      window.removeEventListener('payment-plan-created', handlePaymentPlanCreated)
      console.log('👂 Payment plan event listener removed')
    }
  }, [fetchData])

  // Listen for page focus to refresh data when returning from other pages (with debounce)
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout
    const handlePageFocus = () => {
      // Debounce focus events to prevent excessive refreshing
      clearTimeout(focusTimeout)
      focusTimeout = setTimeout(() => {
        console.log('Page focused, refreshing payment data...')
        fetchData()
      }, 2000) // Wait 2 seconds before refreshing
    }

    window.addEventListener('focus', handlePageFocus)
    return () => {
      window.removeEventListener('focus', handlePageFocus)
      clearTimeout(focusTimeout)
    }
  }, [fetchData])

  // Fetch data using API routes instead of direct Convex queries
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const forceRefresh = async () => {
    try {
      // Clear all possible caches
      localStorage.clear()
      sessionStorage.clear()

      // Clear browser cache if supported
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Clear any IndexedDB data
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases()
          await Promise.all(databases.map(db => {
            if (db.name) {
              const deleteReq = indexedDB.deleteDatabase(db.name)
              return new Promise((resolve) => {
                deleteReq.onsuccess = () => resolve(true)
                deleteReq.onerror = () => resolve(false)
              })
            }
          }))
        } catch (e) {
          console.log('IndexedDB clear failed:', e)
        }
      }

      // Force hard reload with cache bypass
      window.location.href = window.location.href + '?forceRefresh=' + Date.now()
    } catch (error) {
      console.error('Error clearing caches:', error)
      window.location.href = window.location.href + '?forceRefresh=' + Date.now()
    }
  }

  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [bulkOperating, setBulkOperating] = useState(false)

  // Bulk team selection state
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])

  const [showAiActions, setShowAiActions] = useState(false)
  const [groupByTeam, setGroupByTeam] = useState(true)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [teamForm, setTeamForm] = useState({ name: '', description: '', color: '#f97316' })
  const [showParentAssignDialog, setShowParentAssignDialog] = useState(false)
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [assignToTeamId, setAssignToTeamId] = useState<string>('')
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())
  const [showParentCreationModal, setShowParentCreationModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Delete parent function with fallback for dynamic route issues
  const handleDeleteParent = async (parentId: string, parentName: string) => {
    console.log('🚀 DELETE BUTTON CLICKED! Parent:', parentId, parentName)

    const confirmResult = confirm(`Are you sure you want to delete ${parentName}? This action cannot be undone and will remove all associated payments and data.`)
    console.log('❓ User confirmation result:', confirmResult)

    if (!confirmResult) {
      console.log('❌ User cancelled deletion')
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
        console.log('🔄 About to refresh data...')

        // Refresh all data to ensure consistency across both pages
        await fetchData()
        console.log('✅ Data refreshed successfully')

        // Dispatch event to update dashboard and analytics pages
        window.dispatchEvent(new Event('parent-deleted'))
        console.log('🔔 Dispatched parent-deleted event from payments page')

        console.log('🍞 About to show success toast...')
        toast({
          title: '✅ Parent Deleted Successfully',
          description: `${parentName} and all associated payments have been permanently removed.`,
          duration: 5000,
        })
        console.log('✅ Success toast shown!')
      } else {
        const errorData = await response.json()
        console.error('❌ Delete failed:', errorData)
        console.log('🍞 About to show error toast...')

        // Check if parent was already deleted (404) or doesn't exist
        if (response.status === 404 || (errorData.details && errorData.details.includes('not found'))) {
          toast({
            title: '✅ Already Deleted',
            description: `${parentName} was already deleted. Refreshing the page...`,
            duration: 3000,
          })
          // Refresh data since parent was already deleted
          await fetchData(true)
        } else {
          toast({
            title: '❌ Delete Failed',
            description: errorData.details || errorData.error || `Failed to delete ${parentName}`,
            variant: 'destructive',
            duration: 5000,
          })
        }
        console.log('❌ Error toast shown!')
      }
    } catch (error) {
      console.error('💥 Error deleting parent:', error)
      console.log('🍞 About to show exception toast...')
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the parent',
        variant: 'destructive'
      })
      console.log('💥 Exception toast shown!')
    } finally {
      console.log('🏁 Delete process finished, clearing loading state')
      setDeleteLoading(null)
    }
  }

  const payments = paymentsData?.payments || []
  const teams = teamsData || []
  const allParents = allParentsData?.parents || []

  // Debug logging for allParents
  React.useEffect(() => {
    if (allParents.length > 0) {
      const unassignedCount = allParents.filter(p => !p.teamId).length
      console.log('🔍 ALL PARENTS DEBUG:', {
        totalParents: allParents.length,
        unassignedParents: unassignedCount,
        sampleParent: allParents[0],
        unassignedSample: allParents.filter(p => !p.teamId).slice(0, 3).map(p => ({ name: p.name, teamId: p.teamId }))
      })
    }
  }, [allParents])

  const handleAssignParents = async () => {
    if (!assignToTeamId || selectedParents.length === 0) {
      alert('Please select a team and at least one parent')
      return
    }

    try {
      const response = await fetch('/api/teams/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: assignToTeamId === 'unassigned' ? null : assignToTeamId,
          parentIds: selectedParents
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowParentAssignDialog(false)
        setSelectedParents([])
        setAssignToTeamId('')
        toast({
          title: '✅ Assignments Updated',
          description: result.message || 'Parents have been assigned successfully',
          duration: 3000,
        })
        await fetchData(true)
      } else {
        alert('Failed to assign parents to team: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error assigning parents:', error)


      alert('Error assigning parents to team')
    }
  }

  const openParentAssignDialog = () => {
    // fetchAllParents() // This function is no longer needed as allParents is fetched directly
    setShowParentAssignDialog(true)
  }

  const toggleTeamCollapse = (teamName: string) => {
    setCollapsedTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamName)) {
        newSet.delete(teamName)
      } else {
        newSet.add(teamName)
      }
      return newSet
    })
  }

  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/teams', {


        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamForm.name,
          description: teamForm.description,
          color: teamForm.color
        })
      })

      const result = await response.json()

      if (response.ok) {
        setShowTeamDialog(false)
        setTeamForm({ name: '', description: '', color: '#f97316' })
        alert("Team created successfully")
        // Refresh the page to show the new team
        window.location.reload()
      } else {
        alert('Failed to create team: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Error creating team')
    }
  }

  const handleEditTeam = (team: any) => {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      description: team.description || '',
      color: team.color || '#f97316'
    })
    setShowTeamDialog(true)
  }

  const handleUpdateTeam = async () => {
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTeam._id,
          name: teamForm.name,
          description: teamForm.description,
          color: teamForm.color
        })
      })

      const result = await response.json()

      if (response.ok) {
        setShowTeamDialog(false)
        setEditingTeam(null)
        setTeamForm({ name: '', description: '', color: '#f97316' })
        alert("Team updated successfully")
        // Refresh the page to show the updated team
        window.location.reload()
      } else {
        alert('Failed to update team: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Error updating team')
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone. Parents will be moved to Unassigned.')) {
      return
    }

    try {
      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Team Deleted",
          description: "The team was deleted. Parents were moved to Unassigned."
        })
        await fetchData(true)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete team",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      })
    }
  }

  const handleTeamCheckbox = (teamId: string, checked: boolean) => {
    setSelectedTeamIds(prev => checked ? [...new Set([...prev, teamId])] : prev.filter(id => id !== teamId))
  }

  const clearSelectedTeams = () => setSelectedTeamIds([])

  const handleBulkDeleteTeams = async () => {
    if (selectedTeamIds.length === 0) {
      alert('Please select teams to delete')
      return
    }
    const confirmMsg = `Delete ${selectedTeamIds.length} team${selectedTeamIds.length > 1 ? 's' : ''}? Parents in those teams will be moved to Unassigned.`
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch('/api/teams/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: selectedTeamIds })
      })
      const result = await res.json()
      if (res.ok && result?.success) {
        toast({ title: 'Teams deleted', description: `${result.successCount} deleted. ${result.failCount} failed.` })
        clearSelectedTeams()
        await fetchData(true)
      } else {
        toast({ title: 'Error', description: result?.error || 'Failed to delete teams', variant: 'destructive' })
      }
    } catch (e) {
      console.error('Bulk delete error:', e)
      toast({ title: 'Error', description: 'Failed to delete teams', variant: 'destructive' })
    }
  }

  // Unassign a single parent from their team (keeps parent record and moves to Unassigned)
  const handleUnassignParent = async (parentId: string) => {
    try {
      const res = await fetch('/api/teams/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null, parentIds: [parentId] })
      })
      const result = await res.json()
      if (res.ok && result?.success) {
        toast({ title: 'Removed from Team', description: 'Parent moved to Unassigned', duration: 2500 })
        await fetchData(true)
      } else {
        toast({ title: 'Error', description: result?.error || 'Failed to remove from team', variant: 'destructive' })
      }
    } catch (e) {
      console.error('Error unassigning parent:', e)
      toast({ title: 'Error', description: 'Failed to remove from team', variant: 'destructive' })
    }
  }

  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = (payment.parentName || payment.parent?.name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.parentEmail || payment.parent?.email || '')?.toLowerCase().includes(searchTerm.toLowerCase())
    const searchMatch = searchTerm ? matchesSearch : true

    // Team filter
    if (selectedTeam === 'all') {
      return searchMatch
    }

    const parent = allParents.find(p => p._id === payment.parentId)
    if (selectedTeam === 'unassigned') {
      return searchMatch && !parent?.teamId
    }

    return searchMatch && parent?.teamId === selectedTeam
  })

  // Enhance payments with parent data from the database
      const enhancedPayments = filteredPayments.map(payment => {
      // Find matching parent from allParents
      const dbParent = allParents.find(parent =>
        parent._id === payment.parentId ||
        parent.email === payment.parentEmail ||
        parent.name === payment.parentName
      );

    if (dbParent) {
      return {
        ...payment,
        parentName: dbParent.name,
        parentEmail: dbParent.email,
        parent: {
          ...payment.parent,
          name: dbParent.name,
          email: dbParent.email,
          phone: dbParent.phone,
          status: dbParent.status
        }
      };
    }

    return payment;
  });

  // Deduplicate payments to show only the most recent payment per parent
  const deduplicatedPayments = enhancedPayments.reduce((unique: any[], payment) => {
    const existingIndex = unique.findIndex(p => p.parentId === payment.parentId)
    if (existingIndex === -1) {
      unique.push(payment)
    } else {
      // Keep the more recent payment (higher createdAt timestamp)
      const currentCreatedAt = payment.createdAt || payment._creationTime || 0
      const existingCreatedAt = unique[existingIndex].createdAt || unique[existingIndex]._creationTime || 0
      if (currentCreatedAt > existingCreatedAt) {
        unique[existingIndex] = payment
      }
    }
    return unique
  }, [])

  // Group payments by team if enabled, but also include all unassigned parents
  const groupedPayments = groupByTeam ?
    (() => {
      // First group payments by team as before
      const paymentGroups = deduplicatedPayments.reduce((groups: Record<string, any[]>, payment) => {
        // Find the parent's team from allParents data
        const parent = allParents.find(p => p._id === payment.parentId)
        const team = teams.find(t => t._id === parent?.teamId)
        const teamKey = team ? team.name : 'Unassigned'

        if (!groups[teamKey]) {
          groups[teamKey] = []
        }
        groups[teamKey].push(payment)
        return groups
      }, {})

      // Now add ALL unassigned parents (even those without payments) to the Unassigned group
      const unassignedParents = allParents.filter(p => !p.teamId)

      // Create mock payment entries for parents without payments
      const unassignedGroup = paymentGroups['Unassigned'] || []

      unassignedParents.forEach(parent => {
        // IMPROVED: Check if this parent already has ANY payment in the system (not just in this group)
        // This includes payments from payment plans that might not be in the current group yet
        const hasAnyPayment = deduplicatedPayments.some(payment => payment.parentId === parent._id)

        if (!hasAnyPayment) {
          // Create a mock payment entry for display purposes only if parent has NO payments at all
          unassignedGroup.push({
            _id: `mock-${parent._id}`,
            parentId: parent._id,
            parentName: parent.name,
            parentEmail: parent.email,
            amount: 0,
            status: 'no_payment',
            dueDate: new Date().toISOString(),
            createdAt: parent.createdAt || Date.now(),
            remindersSent: 0,
            isMockEntry: true // Flag to identify mock entries
          })
        }
      })

      paymentGroups['Unassigned'] = unassignedGroup
      return paymentGroups
    })() :
    { 'All Payments': deduplicatedPayments }

  const handlePaymentSelection = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments(prev => [...prev, paymentId])
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId))
    }
  }

  const selectAllPayments = () => {
    setSelectedPayments(deduplicatedPayments.map(p => p._id))
  }

  const clearSelection = () => {
    setSelectedPayments([])
  }

  const performBulkOperation = async (action: string) => {
    if (selectedPayments.length === 0) {
      alert('Please select payments first')
      return
    }

    const confirmationMessages = {
      markPaid: `Mark ${selectedPayments.length} payments as paid?`,
      sendReminder: `Send reminders for ${selectedPayments.length} payments?`
    }

    if (!confirm(confirmationMessages[action as keyof typeof confirmationMessages])) {
      return
    }

    setBulkOperating(true)
    try {
      const response = await fetch('/api/payments/overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIds: selectedPayments,
          action
        })
      })

      if (response.ok) {
        setSelectedPayments([])
        const result = await response.json()
        alert(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Operation failed')
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      alert('Operation failed')
    } finally {
      setBulkOperating(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch ((method || '').toLowerCase()) {
      case 'stripe_card':
      case 'credit_card':
      case 'card':
        return 'bg-blue-100 text-blue-800'
      case 'check':
      case 'cheque':
        return 'bg-green-100 text-green-800'
      case 'cash':
        return 'bg-yellow-100 text-yellow-800'
      case 'bank_transfer':
      case 'ach':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResolvedPaymentMethod = (payment: any): string => {
    const direct = (payment?.paymentMethod || '').toLowerCase();
    const fromPlan = (payment?.paymentPlan?.paymentMethod || '').toLowerCase();
    const fromInstallment = (payment?.installments && payment.installments.length > 0 && (payment.installments[0].paymentMethod || '').toLowerCase()) || '';
    const method = direct || fromPlan || fromInstallment;
    return method;
  }

  const calculateSummary = () => {
    const now = Date.now()

    const total = deduplicatedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const paid = deduplicatedPayments.filter(p => p.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0)
    const pending = deduplicatedPayments.filter(p => p.status === 'pending').reduce((sum, payment) => sum + Number(payment.amount), 0)

    // Use consistent overdue logic: status='overdue' OR (status='pending' AND past due date)
    const overdue = deduplicatedPayments.filter(payment => {
      if (payment.status === 'overdue') {
        return true
      }
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < now) {
        return true
      }
      return false
    }).reduce((sum, payment) => sum + Number(payment.amount), 0)

    return { total, paid, pending, overdue }
  }

  const summary = calculateSummary()

  // Compute first-installment-collected and pending from plan totals when analytics isn't reflecting it yet
  const calculatePlanAdjustments = () => {
    // Deduplicate by parent: keep the largest totalAmount plan per parent
    const planByParent: Record<string, any> = {}
    for (const payment of deduplicatedPayments) {
      const plan = payment.paymentPlan
      if (!plan) continue
      const parentKey = String(payment.parentId || '')
      const current = planByParent[parentKey]
      if (!current || Number(plan.totalAmount || 0) > Number(current.totalAmount || 0)) {
        planByParent[parentKey] = plan
      }
    }
    const uniquePlans = Object.values(planByParent)
    const totalPlanAmount = uniquePlans.reduce((s: number, plan: any) => s + Number((plan as any).totalAmount || 0), 0)
    const firstInstallments = uniquePlans.reduce((s: number, plan: any) => s + Number((plan as any).installmentAmount || 0), 0)
    const collected = Number(summary.paid) + firstInstallments
    const pending = Math.max(totalPlanAmount - collected, 0)
    const activePlansCount = uniquePlans.length
    return { totalPlanAmount, firstInstallments, collected, pending, activePlansCount }
  }
  const planAdj = calculatePlanAdjustments()

  // Choose displayed values: if API returns > 0 use it, otherwise use plan-based fallback
  const uiCollected = ((analytics?.collectedPayments ?? 0) > 0)
    ? Number(analytics?.collectedPayments)
    : Number(planAdj.collected)
  const uiPending = ((analytics?.pendingPayments ?? 0) > 0)
    ? Number(analytics?.pendingPayments)
    : Number(planAdj.pending)
  const uiActivePlans = planAdj.activePlansCount || Number(analytics?.activePlans || 0)
  // Total Revenue should reflect potential revenue from plans; prefer authoritative plansTotals
  const uiTotalRevenue = Number((plansTotals?.total ?? analytics?.totalRevenue) ?? planAdj.totalPlanAmount ?? summary.total)
  // Pending should be computed from potential (plan totals) minus collected
  const uiPendingFromTotal = Math.max(Number((plansTotals?.total ?? planAdj.totalPlanAmount) || 0) - uiCollected, 0)
  // Potential revenue is simply the sum of all unique active/pending plan totals
  const uiPotentialRevenue = Number((plansTotals?.total ?? planAdj.totalPlanAmount) || 0)

  // AI Functions

  const generateAIReminders = async () => {
    if (selectedPayments.length === 0) {
      alert('Please select overdue payments first')
      return
    }

    setBulkOperating(true)
    try {
      const response = await fetch('/api/ai/bulk-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'generate_payment_reminders',
          paymentIds: selectedPayments,
          parameters: {
            tone: 'professional',
            urgency: 'medium'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Generated ${data.results.successfullyGenerated} AI-powered payment reminders`)
      }
    } catch (error) {
      console.error('AI reminder generation error:', error)
      alert('Failed to generate AI reminders')
    } finally {
      setBulkOperating(false)
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments Dashboard</h1>
            <p className="text-muted-foreground">
              Manage payments, track progress, and handle overdue accounts
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              {refreshing ? 'Updating...' : 'Live'}
            </div>
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </Button>
            {selectedPayments.length > 0 && (
              <Button
                onClick={generateAIReminders}
                disabled={bulkOperating}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                AI Reminders ({selectedPayments.length})
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/payments/overdue">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Overdue ({analytics?.overdueCount || 0})
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/payment-plans">
                <Calendar className="mr-2 h-4 w-4" />
                Payment Plans
              </Link>
            </Button>
            <Button
              onClick={() => setShowParentCreationModal(true)}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Parent
            </Button>
            <Button asChild>
              <Link href="/payment-plans/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Link>
            </Button>
          </div>
        </div>

        {/* Program Tabs */}
        <Tabs value={activeProgram} onValueChange={setActiveProgram} className="w-full">
          <TabsList className="grid w-full grid-cols-9 h-auto p-1">
            {PROGRAMS.map((program) => (
              <TabsTrigger
                key={program.id}
                value={program.id}
                className="text-xs px-2 py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                {program.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content - Same content for each program */}
          {PROGRAMS.map((program) => (
            <TabsContent key={program.id} value={program.id} className="mt-6">
              <div className="space-y-6">
                {/* Show current program name in title */}
                <div className="text-lg font-semibold text-orange-600">
                  {program.name} - Payment Dashboard
                </div>

                {/* Analytics Cards */}
                <div className="grid gap-4 md:grid-cols-6">
                  {/* Total Parents (moved from dashboard; unchanged markup/text) */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {loading ? '—' : allParents.length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {loading ? 'Loading...' : 'Connected to parents page'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${uiTotalRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        All time
                      </p>
                    </CardContent>
                  </Card>
                  {/* Removed two duplicate Total Potential Revenue cards as requested */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Collected</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">${uiCollected.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        {uiActivePlans} active plans
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">${uiPendingFromTotal.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Awaiting payment
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">${analytics?.overduePayments?.toLocaleString() || summary.overdue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Requires immediate attention
                      </p>
                    </CardContent>
                  </Card>
                  {/* Removed Avg Payment Time card per requirements */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{payments.filter(p => p.paymentPlan).length}</div>
                      <p className="text-xs text-muted-foreground">payment plans</p>
                    </CardContent>
                  </Card>
                </div>

        {/* Revenue Trend Chart */}
        {false && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Revenue Trend (12 Months)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Revenue trend chart</p>
                  <p className="text-xs text-muted-foreground">
                    0 months of data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Operations */}
        {selectedPayments.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedPayments.length} payment{selectedPayments.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performBulkOperation('markPaid')}
                    disabled={bulkOperating}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => performBulkOperation('sendReminder')}
                    disabled={bulkOperating}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={selectAllPayments}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                  <AIInput
                    placeholder="Search by parent name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    fieldType="search_query"
                    context="Search for payments by parent name, email, or payment details"
                    tone="casual"
                    onAIGeneration={(text) => setSearchTerm(text)}
                  />
                </div>
              </div>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Teams</option>
                <option value="unassigned">
                  Unassigned ({allParents.filter(p => !p.teamId).length})
                </option>
                {teams.map((team) => {
                  const teamParentCount = allParents.filter(p => p.teamId === team._id).length
                  return (
                    <option key={team._id} value={team._id}>
                      {team.name} ({teamParentCount})
                    </option>
                  )
                })}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="failed">Failed</option>
              </select>
              {/* Single source of truth: header refresh handles manual refresh */}
            </div>

            {/* Team Organization Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="groupByTeam"
                  checked={groupByTeam}
                  onCheckedChange={(checked) => setGroupByTeam(checked as boolean)}
                />
                <label htmlFor="groupByTeam" className="text-sm font-medium">
                  Group by Team
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedTeam !== 'all'
                  ? `Showing ${selectedTeam === 'unassigned' ? 'unassigned parents' : teams.find(t => t._id === selectedTeam)?.name || 'selected team'}`
                  : `${teams.length} teams available`
                }
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <Button variant="destructive" size="sm" disabled={selectedTeamIds.length === 0} onClick={handleBulkDeleteTeams} title="Delete selected teams (parents moved to Unassigned)">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected Teams {selectedTeamIds.length > 0 ? `(${selectedTeamIds.length})` : ''}
                </Button>
                <Button variant="outline" size="sm" onClick={openParentAssignDialog}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Parents
                </Button>
                <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingTeam(null)
                      setTeamForm({ name: '', description: '', color: '#f97316' })
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="teamName">Team Name</Label>
                        <Input
                          id="teamName"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                          placeholder="e.g., Rises as One Red"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamDescription">Description (Optional)</Label>
                        <Input
                          id="teamDescription"
                          value={teamForm.description}
                          onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                          placeholder="Team description..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="teamColor">Team Color</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            id="teamColor"
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            className="w-12 h-8 rounded border"
                          />
                          <Input
                            value={teamForm.color}
                            onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                            placeholder="#f97316"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}>
                          {editingTeam ? 'Update' : 'Create'} Team
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                        {teams.length > 0 && (
                          <div className="flex items-center space-x-1">
                            {teams.slice(0, 3).map((team) => {
                              const teamParentCount = allParents.filter(p => p.teamId === team._id).length
                              return (
                                <div
                                  key={team._id}
                                  className="flex items-center space-x-1 text-xs bg-muted px-2 py-1 rounded"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: team.color || '#f97316' }}
                                  />
                                  <span>{team.name}</span>
                                  <span className="text-muted-foreground">({teamParentCount})</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1"
                                    onClick={() => handleEditTeam(team)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            })}
                            {teams.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{teams.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payments Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Payments by Parent</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Showing the most recent payment for each parent. Click &quot;View Details &amp; History&quot; to see all payments for a parent.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(groupedPayments).map(([groupName, groupPayments]) => {
                const team = teams.find(t => t.name === groupName)
                const isUnassigned = groupName === 'Unassigned'
                const isCollapsed = collapsedTeams.has(groupName)

                return (
                  <Collapsible key={groupName} open={!isCollapsed} onOpenChange={() => toggleTeamCollapse(groupName)}>
                    <div className="space-y-4">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                          <div className="flex items-center space-x-3">
                            {!isUnassigned && (
                              <Checkbox
                                checked={selectedTeamIds.includes(team!._id)}
                                onCheckedChange={(checked) => { handleTeamCheckbox(team!._id, !!checked); }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{
                                backgroundColor: isUnassigned ? '#6b7280' : (team?.color || '#f97316')
                              }}
                            />
                            <h3 className="text-lg font-semibold text-orange-600">
                              {groupName} ({isUnassigned ? allParents.filter(p => !p.teamId).length : allParents.filter(p => p.teamId === team?._id).length} {(isUnassigned ? allParents.filter(p => !p.teamId).length : allParents.filter(p => p.teamId === team?._id).length) === 1 ? 'parent' : 'parents'})
                            </h3>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {team && (
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTeam(team)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTeam(team._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-3">
                        {groupPayments.length > 0 ? (
                          <div className="space-y-3 border-l-4 pl-4 ml-2" style={{
                            borderColor: isUnassigned ? '#6b7280' : (team?.color || '#f97316')
                          }}>
                            {groupPayments.map((payment) => (
                          <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center space-x-4">
                              {!payment.isMockEntry && (
                                <Checkbox
                                  checked={selectedPayments.includes(payment._id)}
                                  onCheckedChange={(checked) => handlePaymentSelection(payment._id, checked as boolean)}
                                />
                              )}
                              <div className="flex items-center space-x-2">
                                {payment.isMockEntry ? (
                                  <Badge variant="outline" className="flex items-center space-x-1">
                                    <Users className="h-3 w-3" />
                                    <span>No Payment Plan</span>
                                  </Badge>
                                ) : (
                                  payment.paymentPlan && payment.status === 'pending' ? (
                                    <Badge className="flex items-center space-x-1 capitalize bg-green-600 text-white">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>Active</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant={getStatusVariant(payment.status)} className="flex items-center space-x-1 capitalize">
                                      {getStatusIcon(payment.status)}
                                      <span>{payment.status}</span>
                                    </Badge>
                                  )
                                )}
                                {payment.paymentPlan && (
                                  <Badge variant="outline" className="capitalize">
                                    {payment.paymentPlan.type}
                                  </Badge>
                                )}
                              </div>
                              <div>
                                  <div className="flex items-center space-x-2">
                                  <p className="font-medium">{payment.parentName || payment.parent?.name || 'Unknown Parent'}</p>
                                      <Badge className={getPaymentMethodColor((payment.paymentMethod || payment.paymentPlan?.paymentMethod || 'stripe_card'))}>
                                        {(() => {
                                          const method = (payment.paymentMethod || payment.paymentPlan?.paymentMethod || 'stripe_card');
                                          return {
                                            'stripe_card': 'Credit Card',
                                            'credit_card': 'Credit Card',
                                            'card': 'Credit Card',
                                            'check': 'Check',
                                            'cheque': 'Check',
                                            'cash': 'Cash',
                                          }[method] || 'Credit Card'
                                        })()}
                                      </Badge>
                                  {!payment.isMockEntry && payment.status === 'overdue' && (
                                    <Badge variant="destructive" className="text-xs font-bold">
                                      OVERDUE
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{payment.parentEmail || payment.parent?.email || 'No email'}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {payment.isMockEntry ? (
                                    <Badge variant="secondary" className="text-xs">
                                      Ready for Payment Plan
                                    </Badge>
                                  ) : (
                                    <>
                                      <Badge variant="secondary" className="text-xs">
                                        Latest Payment
                                      </Badge>
                                      {payment.remindersSent > 0 && (
                                        <p className="text-xs text-orange-600">
                                          {payment.remindersSent} reminder{payment.remindersSent !== 1 ? 's' : ''} sent
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {payment.isMockEntry ? (
                                <div className="text-center">
                                  <p className="text-lg font-semibold text-muted-foreground">No Payment Plan</p>
                                  <p className="text-sm text-muted-foreground">Create a payment plan to get started</p>
                                </div>
                              ) : (
                                <>
                                  <p className="text-xl font-semibold">${Number(payment.amount).toLocaleString()}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Due: {new Date(payment.dueDate).toLocaleDateString()}
                                  </p>
                                  {payment.paidAt && (
                                    <p className="text-sm text-green-600">
                                      Paid: {new Date(payment.paidAt).toLocaleDateString()}
                                    </p>
                                  )}
                                  {payment.status === 'overdue' && (
                                    <p className="text-sm text-red-600">
                                      {Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue

                                    </p>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              {payment.isMockEntry ? (
                                <Button asChild variant="default" size="sm">
                                  <Link href="/payment-plans/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Payment Plan
                                  </Link>
                                </Button>
                              ) : (
                                <>
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/payments/${payment._id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details & History
                                    </Link>
                                  </Button>
                                  {payment.status === 'pending' && (
                                    <Button size="sm">
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark Paid
                                    </Button>
                                  )}

                                </>
                              )}
                                  {!isUnassigned && (
                                    <Button variant="outline" size="sm" onClick={() => handleUnassignParent(payment.parentId)} title="Remove from team (keeps parent in Unassigned)">
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Remove from Team
                                    </Button>
                                  )}

                              {/* Delete parent button for all entries (both mock and real) */}
                              <Button
                                variant="outline"
                                size="sm"

                                onClick={() => handleDeleteParent(payment.parentId, payment.parentName || 'Unknown Parent')}
                                disabled={deleteLoading === payment.parentId}
                                title="Delete entire parent (including all payments)"
                                className="text-red-800 hover:text-red-900"
                              >
                                {deleteLoading === payment.parentId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No payments found in this group</h3>
                        <p className="text-muted-foreground mb-4">
                          Try adjusting your search criteria or status filter.
                        </p>
                        <Button asChild>
                          <Link href="/payment-plans/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Payment Plan
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
                      </Collapsible>
                    )
                  })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>

      {/* Parent Assignment Dialog */}
      <Dialog open={showParentAssignDialog} onOpenChange={setShowParentAssignDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Parents to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignTeam">Select Team</Label>
              <Select value={assignToTeamId} onValueChange={setAssignToTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span>Unassigned</span>
                      <span className="text-muted-foreground">
                        ({allParents.filter(p => !p.teamId).length} parents)
                      </span>
                    </div>
                  </SelectItem>
                  {teams.map((team) => {
                    const teamParentCount = allParents.filter(p => p.teamId === team._id).length
                    return (
                      <SelectItem key={team._id} value={team._id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color || '#f97316' }}
                          />
                          <span>{team.name}</span>
                          <span className="text-muted-foreground">({teamParentCount} parents)</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Parents to Assign</Label>
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {Array.isArray(allParents) && allParents.length > 0 ? (
                    allParents.map((parent) => (
                      <div key={parent._id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                        <Checkbox
                          checked={selectedParents.includes(parent._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedParents([...selectedParents, parent._id])
                            } else {
                              setSelectedParents(selectedParents.filter(id => id !== parent._id))
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{parent.name}</div>
                          <div className="text-sm text-muted-foreground">{parent.email}</div>
                          {parent.teamId && (
                            <div className="text-xs text-muted-foreground">
                              Team ID: {parent.teamId}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {allParents === null ? (
                        <div>Loading parents...</div>
                      ) : (
                        <div>No parents found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedParents.length} parent(s) selected
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowParentAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignParents} disabled={!assignToTeamId || selectedParents.length === 0}>
                  Assign to Team
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parent Creation Modal */}
      <ParentCreationModal
        open={showParentCreationModal}
        onOpenChange={setShowParentCreationModal}
        onParentCreated={async (newParent) => {
          console.log('🎉 New parent created:', newParent)

          // Show immediate success notification
          toast({
            title: "✅ Parent Created Successfully!",
            description: `${newParent.name} has been created and will appear in UNASSIGNED section`,
            variant: "default",
          })

          // Close the modal first
          setShowParentCreationModal(false)

          // Refresh data with aggressive cache busting
          try {
            setLoading(true)

            const timestamp = Date.now() + Math.random() * 10000
            const cacheKey = `parent-created-${timestamp}`

            // Clear any existing cache entries
            if (typeof window !== 'undefined') {
              localStorage.removeItem('payments-cache')
              sessionStorage.removeItem('payments-cache')
            }

            const [paymentsRes, analyticsRes, teamsRes, parentsRes] = await Promise.all([
              fetch(`/api/payments?t=${timestamp}&nocache=true&cb=${cacheKey}&limit=1000`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }),
              fetch(`/api/payments/analytics?t=${timestamp}&nocache=true&cb=${cacheKey}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }),
              fetch(`/api/teams?t=${timestamp}&nocache=true&cb=${cacheKey}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }),
              fetch(`/api/parents?limit=1000&t=${timestamp}&nocache=true&cb=${cacheKey}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              })
            ])

            const paymentsResult = await paymentsRes.json()
            const analyticsResult = await analyticsRes.json()
            const teamsResult = await teamsRes.json()
            const parentsResult = await parentsRes.json()

            if (paymentsResult.success) setPaymentsData(paymentsResult.data)
            if (analyticsResult.success) setAnalytics(analyticsResult.data)
            if (teamsResult.success) setTeamsData(teamsResult.data)
            if (parentsResult.success) {
              setAllParentsData(parentsResult.data)

              const parentCount = parentsResult.data?.parents?.length || 0
              const unassignedCount = parentsResult.data?.parents?.filter((p: any) => !p.teamId).length || 0

              console.log('🔄 Data refreshed after parent creation:', {
                totalParents: parentCount,
                unassignedParents: unassignedCount,
                newParentFound: parentsResult.data?.parents?.find((p: any) => p.name === newParent.name)
              })

              // Show confirmation that parent appears in UNASSIGNED
              toast({
                title: "🎯 Parent Now Visible!",
                description: `${newParent.name} is now in UNASSIGNED section (${unassignedCount} total unassigned)`,
                variant: "default",
              })
            }

            setLoading(false)
          } catch (error) {
            console.error('Error refreshing data after parent creation:', error)
            toast({
              title: "⚠️ Refresh Error",
              description: "Parent was created but page refresh failed. Please refresh manually.",
              variant: "destructive",
            })
            setLoading(false)
          }
        }}
      />

      <Toaster />
    </div>
  </AppLayout>
  )
}
