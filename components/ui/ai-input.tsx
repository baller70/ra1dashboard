
'use client'

import * as React from "react"
import { useState, useRef, useCallback } from "react"
import { cn } from "../../lib/utils"
import { Input } from "./input"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { 
  Brain, 
  Wand2, 
  Edit, 
  Plus, 
  Target, 
  Sparkles, 
  RotateCcw,
  RefreshCw,
  Check,
  X,
  Lightbulb
} from "lucide-react"

export interface AIInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fieldType?: string
  context?: string
  tone?: 'professional' | 'friendly' | 'formal' | 'casual' | 'urgent'
  enableAI?: boolean
  parentData?: any
  onAIGeneration?: (text: string) => void
}

const AIInput = React.forwardRef<HTMLInputElement, AIInputProps>(
  ({ 
    className, 
    type, 
    fieldType = 'general',
    context = '',
    tone = 'professional',
    enableAI = true,
    parentData = null,
    onAIGeneration,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [isAILoading, setIsAILoading] = useState(false)
    const [showAIOptions, setShowAIOptions] = useState(false)
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [originalValue, setOriginalValue] = useState('')
    const [aiHistory, setAiHistory] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    const callAIWritingAPI = useCallback(async (
      endpoint: string, 
      payload: any
    ): Promise<string> => {
      setIsAILoading(true)
      try {
        const response = await fetch(`/api/ai/writing/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...payload,
            fieldType,
            context,
            tone,
            parentData
          })
        })

        if (!response.ok) {
          throw new Error('AI request failed')
        }

        if (endpoint === 'suggestions') {
          const data = await response.json()
          return data.suggestions
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let result = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  return result.trim()
                }
                try {
                  const parsed = JSON.parse(data)
                  result += parsed.content || ''
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        return result.trim()
      } catch (error) {
        console.error('AI writing error:', error)
        throw error
      } finally {
        setIsAILoading(false)
      }
    }, [fieldType, context, tone, parentData])

    const handleAICompose = async (prompt?: string) => {
      try {
        setOriginalValue((value as string) || '')
        const result = await callAIWritingAPI('compose', {
          prompt: prompt || `Generate content for this ${fieldType} field`,
          length: 'medium',
          includePersonalization: !!parentData
        })
        
        const newValue = result
        if (onChange) {
          onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>)
        }
        if (onAIGeneration) {
          onAIGeneration(newValue)
        }
        setAiHistory(prev => [...prev, newValue])
      } catch (error) {
        console.error('AI compose error:', error)
      }
    }

    const handleAIImprove = async () => {
      if (!value) return
      
      try {
        setOriginalValue((value as string) || '')
        const result = await callAIWritingAPI('improve', {
          text: value,
          improvementType: 'overall'
        })
        
        const newValue = result
        if (onChange) {
          onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>)
        }
        if (onAIGeneration) {
          onAIGeneration(newValue)
        }
        setAiHistory(prev => [...prev, newValue])
      } catch (error) {
        console.error('AI improve error:', error)
      }
    }

    const handleAIComplete = async () => {
      if (!value) return
      
      try {
        setOriginalValue((value as string) || '')
        const result = await callAIWritingAPI('complete', {
          partialText: value,
          maxLength: 'medium'
        })
        
        const newValue = (value as string) + result
        if (onChange) {
          onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>)
        }
        if (onAIGeneration) {
          onAIGeneration(newValue)
        }
        setAiHistory(prev => [...prev, newValue])
      } catch (error) {
        console.error('AI complete error:', error)
      }
    }

    const handleGetSuggestions = async () => {
      try {
        const result = await callAIWritingAPI('suggestions', {
          currentText: value || '',
          suggestionType: 'alternatives'
        }) as any
        
        if (result && result.alternatives && Array.isArray(result.alternatives)) {
          setAiSuggestions(result.alternatives)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('AI suggestions error:', error)
      }
    }

    const applySuggestion = (suggestion: string) => {
      if (onChange) {
        onChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>)
      }
      if (onAIGeneration) {
        onAIGeneration(suggestion)
      }
      setShowSuggestions(false)
      setAiHistory(prev => [...prev, suggestion])
    }

    const handleUndo = () => {
      if (originalValue !== undefined) {
        if (onChange) {
          onChange({ target: { value: originalValue } } as React.ChangeEvent<HTMLInputElement>)
        }
        setOriginalValue('')
      }
    }

    if (!enableAI) {
      return (
        <Input
          type={type}
          className={className}
          ref={ref}
          value={value}
          onChange={onChange}
          {...props}
        />
      )
    }

    return (
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              type={type}
              className={cn(
                "pr-12", // Space for AI indicator
                className
              )}
              ref={ref || inputRef}
              value={value}
              onChange={onChange}
              {...props}
            />
            
            {/* AI Indicator */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Badge 
                variant="outline" 
                className="h-6 px-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-xs"
              >
                <Brain className="h-3 w-3 mr-1" />
                AI
              </Badge>
            </div>
          </div>

          {/* AI Actions */}
          <Popover open={showAIOptions} onOpenChange={setShowAIOptions}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-purple-300 hover:bg-purple-50"
                disabled={isAILoading}
              >
                {isAILoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">AI Writing Assistant</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAICompose()}
                    disabled={isAILoading}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Compose
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIImprove}
                    disabled={isAILoading || !value}
                    className="text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Improve
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIComplete}
                    disabled={isAILoading || !value}
                    className="text-xs"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetSuggestions}
                    disabled={isAILoading}
                    className="text-xs"
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Suggest
                  </Button>
                </div>

                {originalValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    className="w-full text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Undo AI Change
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* AI Suggestions */}
        {showSuggestions && aiSuggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 border-purple-200 bg-purple-50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center">
                  <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                  AI Suggestions
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestions(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded border text-xs cursor-pointer hover:bg-gray-50"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <span className="flex-1 truncate">{suggestion}</span>
                    <Check className="h-3 w-3 text-green-600 ml-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
)

AIInput.displayName = "AIInput"

export { AIInput }
