'use client'

// Force dynamic rendering - prevent static generation

import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useToast } from '../../hooks/use-toast'
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [testType, setTestType] = useState('payment_reminder')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const { toast } = useToast()

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/emails/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          testType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setLastResult(data)
        toast({
          title: 'Success!',
          description: `Test email sent successfully to ${email}`,
        })
      } else {
        throw new Error(data.details || data.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send test email',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Email Testing</h1>
        <p className="text-muted-foreground">
          Test the Resend email functionality with different email templates
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify Resend integration is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="testType" className="text-sm font-medium">
              Email Template
            </label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select email template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                <SelectItem value="overdue_notice">Overdue Notice</SelectItem>
                <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={sendTestEmail} 
            disabled={isLoading || !email}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Last Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Status:</strong> {lastResult.success ? 'Success' : 'Failed'}
              </div>
              <div>
                <strong>Message:</strong> {lastResult.message}
              </div>
              {lastResult.messageId && (
                <div>
                  <strong>Message ID:</strong> {lastResult.messageId}
                </div>
              )}
              <div>
                <strong>Timestamp:</strong> {lastResult.testData?.timestamp}
              </div>
              <div>
                <strong>Email Type:</strong> {lastResult.testData?.testType}
              </div>
              <div>
                <strong>Sent To:</strong> {lastResult.testData?.to}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          Email Templates Available
        </h3>
        <ul className="text-sm space-y-1 text-blue-700">
          <li><strong>Payment Reminder:</strong> Friendly reminder for upcoming payment</li>
          <li><strong>Overdue Notice:</strong> Urgent notice for overdue payments</li>
          <li><strong>Payment Confirmation:</strong> Thank you message after payment</li>
        </ul>
      </div>
    </div>
  )
} 
