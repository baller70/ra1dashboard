'use client'

// Force dynamic rendering - prevent static generation

import { useState } from 'react'
import { AppLayout } from '../../components/app-layout'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { useToast } from '../../hooks/use-toast'
import { toast } from 'sonner'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'

export default function TestNotificationsPage() {
  const { toast: customToast } = useToast()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testCustomToast = () => {
    customToast({
      title: '✅ Custom Toast Success!',
      description: 'This is using the custom toast system (useToast hook)',
      duration: 5000,
    })
    addResult('Custom toast triggered')
  }

  const testSonnerToast = () => {
    toast.success('✅ Sonner Toast Success!', {
      description: 'This is using the Sonner toast system',
      duration: 5000,
    })
    addResult('Sonner toast triggered')
  }

  const testErrorToast = () => {
    customToast({
      title: '❌ Error Toast Test',
      description: 'This is an error message using custom toast',
      variant: 'destructive',
      duration: 7000,
    })
    addResult('Error toast triggered')
  }

  const testSonnerError = () => {
    toast.error('❌ Sonner Error Test', {
      description: 'This is an error message using Sonner',
      duration: 7000,
    })
    addResult('Sonner error triggered')
  }

  const testApiMessage = async () => {
    try {
      addResult('Testing API message send...')
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId: 'j571jaamzc3r52ksnbb0bekcms7m5qn9',
          message: 'Test message for notification verification',
          method: 'email',
          type: 'payment_reminder',
          subject: 'Notification Test Message'
        })
      })

      if (response.ok) {
        const result = await response.json()
        customToast({
          title: '✅ API Message Sent Successfully!',
          description: `Message sent with ID: ${result.messageId}`,
          duration: 5000,
        })
        addResult(`API message sent successfully: ${result.messageId}`)
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      customToast({
        title: '❌ API Message Failed',
        description: 'Failed to send test message via API',
        variant: 'destructive',
        duration: 7000,
      })
      addResult('API message failed')
    }
  }

  const testBulkSend = async () => {
    try {
      addResult('Testing bulk send...')
      
      const response = await fetch('/api/communication/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentIds: ['j575pe13bk6q79y02vst3qa4zh7m5w0h'],
          subject: 'Bulk Send Notification Test',
          body: 'This is a test message for bulk send notification verification.',
          channel: 'email',
          messageType: 'custom'
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Bulk Send Successful!', {
          description: `${result.message}`,
          duration: 5000,
        })
        addResult(`Bulk send successful: ${result.message}`)
      } else {
        throw new Error('Bulk send failed')
      }
    } catch (error) {
      toast.error('❌ Bulk Send Failed', {
        description: 'Failed to send bulk message',
        duration: 7000,
      })
      addResult('Bulk send failed')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Toast Notification Test</h1>
          <p className="text-muted-foreground">
            Test different types of toast notifications to verify they're working properly.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Toast System Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={testCustomToast} className="w-full">
                Test Custom Toast (Success)
              </Button>
              <Button onClick={testSonnerToast} variant="outline" className="w-full">
                Test Sonner Toast (Success)
              </Button>
              <Button onClick={testErrorToast} variant="destructive" className="w-full">
                Test Custom Toast (Error)
              </Button>
              <Button onClick={testSonnerError} variant="destructive" className="w-full">
                Test Sonner Toast (Error)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                API Integration Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={testApiMessage} className="w-full">
                Test API Message Send
              </Button>
              <Button onClick={testBulkSend} variant="outline" className="w-full">
                Test Bulk Send API
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">No tests run yet. Click the buttons above to test toast notifications.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-muted p-2 rounded">
                    {result}
                  </div>
                ))
              )}
            </div>
            {testResults.length > 0 && (
              <Button 
                onClick={() => setTestResults([])} 
                variant="outline" 
                size="sm" 
                className="mt-3"
              >
                Clear Results
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
} 
