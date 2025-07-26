
'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { 
  Brain, 
  Search, 
  Filter,
  Zap,
  Play,
  X,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  CreditCard,
  FileText,
  Users,
  Target,
  Lightbulb,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { AIRecommendationWithRelations } from '../../lib/types'

export default function AIInsightsPage() {
  const [recommendations, setRecommendations] = useState<AIRecommendationWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [executing, setExecuting] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/ai-recommendations')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewRecommendations = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/ai-recommendations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisType: 'comprehensive'
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Generated ${result.totalGenerated} new recommendations!`)
        fetchRecommendations()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate recommendations')
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate recommendations')
    } finally {
      setGenerating(false)
    }
  }

  const handleExecuteRecommendation = async (recommendationId: string) => {
    setExecuting(recommendationId)
    try {
      const response = await fetch(`/api/ai-recommendations/${recommendationId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: 'Executed via AI Insights dashboard'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const successCount = result.executionResults.filter((r: any) => r.success).length
        alert(`Recommendation executed! ${successCount} actions completed successfully.`)
        fetchRecommendations()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to execute recommendation')
      }
    } catch (error) {
      console.error('Execution error:', error)
      alert('Failed to execute recommendation')
    } finally {
      setExecuting(null)
    }
  }

  const handleDismissRecommendation = async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/ai-recommendations/${recommendationId}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Not relevant',
          feedback: 'Dismissed by user'
        })
      })

      if (response.ok) {
        fetchRecommendations()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to dismiss recommendation')
      }
    } catch (error) {
      console.error('Dismiss error:', error)
      alert('Failed to dismiss recommendation')
    }
  }

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter
    const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter
    
    return matchesSearch && matchesCategory && matchesPriority
  })

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Medium</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return <MessageSquare className="h-4 w-4" />
      case 'payment':
        return <CreditCard className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
      case 'relationship':
        return <Users className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 75) return 'text-blue-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
            <h1 className="text-3xl font-bold tracking-tight">AI Insights & Recommendations</h1>
            <p className="text-muted-foreground">
              Smart recommendations powered by AI to optimize your program management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
              <Brain className="mr-1 h-3 w-3" />
              AI Powered
            </Badge>
            <Button
              onClick={generateNewRecommendations}
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate New'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{recommendations.length}</div>
                  <div className="text-xs text-muted-foreground">Total Recommendations</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {recommendations.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {recommendations.filter(r => r.isExecuted).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Executed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {recommendations.filter(r => r.autoExecutable && !r.isExecuted).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Auto-Executable</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search recommendations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="communication">Communication</option>
                  <option value="payment">Payment</option>
                  <option value="contract">Contract</option>
                  <option value="relationship">Relationship</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations List */}
        <div className="space-y-4">
          {filteredRecommendations.map((recommendation) => (
            <Card key={recommendation.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getCategoryIcon(recommendation.category)}
                      <CardTitle className="text-lg font-semibold">
                        {recommendation.title}
                      </CardTitle>
                      {getPriorityBadge(recommendation.priority)}
                      {recommendation.autoExecutable && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          <Zap className="mr-1 h-3 w-3" />
                          Auto
                        </Badge>
                      )}
                      {recommendation.isExecuted && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Done
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span className="capitalize">{recommendation.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="capitalize">{recommendation.expectedImpact} impact</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Brain className="h-3 w-3" />
                        <span className={getConfidenceColor(recommendation.confidence)}>
                          {recommendation.confidence}% confident
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(recommendation.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!recommendation.isExecuted && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleExecuteRecommendation(recommendation.id)}
                          disabled={executing === recommendation.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {executing === recommendation.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                          ) : (
                            <Play className="mr-1 h-3 w-3" />
                          )}
                          Execute
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissRecommendation(recommendation.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-muted-foreground">
                  {recommendation.description}
                </p>

                {/* Context */}
                {recommendation.context && Object.keys(recommendation.context).length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Context:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                      {Object.entries(recommendation.context).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center">
                    <Lightbulb className="mr-2 h-4 w-4 text-yellow-600" />
                    Recommended Actions ({Array.isArray(recommendation.actions) ? recommendation.actions.length : 0})
                  </h4>
                  
                  <div className="space-y-2">
                    {Array.isArray(recommendation.actions) && recommendation.actions.map((action: any, index: number) => {
                      const act = typeof action === 'string' ? { title: action } : (action || {});
                      return (
                        <div key={act.id ?? index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium">{act.title ?? `Action ${index + 1}`}</h5>
                              <div className="flex items-center space-x-2">
                                {act.actionType && (
                                  <Badge variant="outline" className="text-xs">
                                    {act.actionType}
                                  </Badge>
                                )}
                                {act.isRequired && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                                )}
                                {act.isExecuted && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <CheckCircle2 className="mr-1 h-2 w-2" />
                                    Done
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {act.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Execution Results */}
                {recommendation.isExecuted && recommendation.executionResult && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Execution Results
                      </h4>
                      <div className="text-xs text-green-700">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <strong>Total Actions:</strong> {(recommendation.executionResult as any)?.totalActions || 0}
                          </div>
                          <div>
                            <strong>Successful:</strong> {(recommendation.executionResult as any)?.successfulActions || 0}
                          </div>
                          <div>
                            <strong>Failed:</strong> {(recommendation.executionResult as any)?.failedActions || 0}
                          </div>
                        </div>
                        {recommendation.executedAt && (
                          <div className="mt-2">
                            <strong>Executed on:</strong> {new Date(recommendation.executedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expiration Warning */}
                {recommendation.expiresAt && new Date(recommendation.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Expires on {new Date(recommendation.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRecommendations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No recommendations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Generate AI recommendations to get intelligent insights for your program'
                }
              </p>
              <Button
                onClick={generateNewRecommendations}
                disabled={generating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                {generating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate Recommendations'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
