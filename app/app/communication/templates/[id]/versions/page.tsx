// @ts-nocheck
'use client'

// Force dynamic rendering - prevent static generation
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../../../components/app-layout'
import { Button } from '../../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Badge } from '../../../../../components/ui/badge'
import { Separator } from '../../../../../components/ui/separator'
import { 
  ArrowLeft, 
  Check, 
  X,
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  User,
  Eye,
  GitBranch,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { TemplateVersionWithRelations } from '../../../../../lib/types'

export default function TemplateVersionsPage() {
  const params = useParams()
  const router = useRouter()
  const [versions, setVersions] = useState<TemplateVersionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [params.id])

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      }
    } catch (error) {
      console.error('Failed to fetch template versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptVersion = async (versionId: string) => {
    setAccepting(versionId)
    try {
      const response = await fetch(`/api/templates/${params.id}/versions/${versionId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: 'Version accepted and applied to main template'
        })
      })

      if (response.ok) {
        alert('Version accepted successfully!')
        router.push(`/communication/templates/${params.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to accept version')
      }
    } catch (error) {
      console.error('Version acceptance error:', error)
      alert('Failed to accept version')
    } finally {
      setAccepting(null)
    }
  }

  const getImprovementBadgeColor = (type: string) => {
    switch (type) {
      case 'effectiveness':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'personalization':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'clarity_enhancement':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'tone_adjustment':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
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
            <Button variant="outline" asChild>
              <Link href={`/communication/templates/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Template Versions</h1>
              <p className="text-muted-foreground">
                Review and manage AI-enhanced template versions
              </p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1">
            <GitBranch className="mr-1 h-3 w-3" />
            {versions.length} Versions
          </Badge>
        </div>

        {/* Versions List */}
        <div className="space-y-4">
          {versions.map((version, index) => (
            <Card key={version.id} className={`transition-all duration-200 ${
              index === 0 ? 'border-2 border-green-200 bg-green-50/30' : 'hover:shadow-md'
            }`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-lg font-semibold">
                        Version {version.version}
                      </CardTitle>
                      {index === 0 && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Check className="mr-1 h-3 w-3" />
                          Latest
                        </Badge>
                      )}
                      {version.isAiGenerated && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          <Brain className="mr-1 h-3 w-3" />
                          AI Enhanced
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{version.createdBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                      </div>
                      {version.performanceScore && (
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>Score: {version.performanceScore.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1 h-3 w-3" />
                      Preview
                    </Button>
                    {!version.improvements?.every(imp => imp.accepted) && (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptVersion(version.id)}
                        disabled={accepting === version.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {accepting === version.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        Accept Version
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Change Description */}
                {version.changeDescription && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Changes:</strong> {version.changeDescription}
                    </p>
                  </div>
                )}

                {/* AI Prompt */}
                {version.aiPrompt && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>AI Prompt:</strong> {version.aiPrompt}
                    </p>
                  </div>
                )}

                {/* Template Content */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subject</label>
                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded border">
                      {version.subject}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Body</label>
                    <div className="text-sm mt-1 p-3 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                      {version.body}
                    </div>
                  </div>
                </div>

                {/* Improvements */}
                {version.improvements && version.improvements.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center">
                        <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                        AI Improvements ({version.improvements.length})
                      </h4>
                      
                      <div className="space-y-3">
                        {version.improvements.map((improvement) => (
                          <div key={improvement.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className={getImprovementBadgeColor(improvement.improvementType)}>
                                {improvement.improvementType.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <BarChart3 className="h-3 w-3" />
                                <span>{improvement.confidence}% confidence</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {improvement.reason}
                            </p>

                            <div className="grid gap-2 text-xs">
                              <div>
                                <strong className="text-red-600">Before:</strong>
                                <div className="bg-red-50 border border-red-200 rounded p-2 mt-1">
                                  {improvement.originalText.substring(0, 200)}
                                  {improvement.originalText.length > 200 && '...'}
                                </div>
                              </div>
                              
                              <div>
                                <strong className="text-green-600">After:</strong>
                                <div className="bg-green-50 border border-green-200 rounded p-2 mt-1">
                                  {improvement.improvedText.substring(0, 200)}
                                  {improvement.improvedText.length > 200 && '...'}
                                </div>
                              </div>
                            </div>

                            {improvement.accepted && (
                              <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                                <Check className="h-3 w-3" />
                                <span>Accepted on {new Date(improvement.acceptedAt!).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics */}
                {version.analytics && version.analytics.length > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />
                        Performance Analytics
                      </h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {version.analytics.map((analytic) => (
                          <div key={analytic.id} className="text-center p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-lg font-bold text-blue-700">
                              {analytic.metricType === 'open_rate' || analytic.metricType === 'response_rate' || analytic.metricType === 'conversion_rate'
                                ? `${analytic.value.toFixed(1)}%`
                                : analytic.value.toFixed(1)
                              }
                            </div>
                            <div className="text-xs text-blue-600 capitalize">
                              {analytic.metricType.replace('_', ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Usage Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center space-x-4">
                    <span>Usage: {version.usageCount} times</span>
                    {version.successRate && (
                      <span>Success Rate: {version.successRate.toFixed(1)}%</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600">
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {versions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No versions found</h3>
              <p className="text-muted-foreground mb-4">
                This template doesn't have any AI-enhanced versions yet
              </p>
              <Button asChild>
                <Link href={`/communication/templates/${params.id}/edit`}>
                  <Brain className="mr-2 h-4 w-4" />
                  Enhance with AI
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
