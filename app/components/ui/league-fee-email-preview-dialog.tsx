'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { Textarea } from './textarea'
import { Input } from './input'
import { Label } from './label'
import { Badge } from './badge'
import { useToast } from './use-toast'
import { Mail, Users, Edit3, Send, Eye, DollarSign, CreditCard, Building2 } from 'lucide-react'

interface Parent {
  _id: string
  name: string
  email: string
}

interface EmailPreviewData {
  subject: string
  body: string
  paymentAmount: number
  processingFee: number
  totalAmount: number
  seasonName: string
  dueDate: string
  stripePaymentLink: string
  facilityPaymentLink: string
}

interface LeagueFeeEmailPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedParents: Parent[]
  seasonName: string
  emailPreview: EmailPreviewData | null
  onSendEmails: (subject: string, body: string) => Promise<void>
  isSending: boolean
  isGenerating: boolean
}

export function LeagueFeeEmailPreviewDialog({
  open,
  onOpenChange,
  selectedParents,
  seasonName,
  emailPreview,
  onSendEmails,
  isSending,
  isGenerating
}: LeagueFeeEmailPreviewDialogProps) {
  const [editableSubject, setEditableSubject] = useState('')
  const [editableBody, setEditableBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  // Update editable content when emailPreview changes
  useEffect(() => {
    if (emailPreview) {
      setEditableSubject(emailPreview.subject)
      setEditableBody(emailPreview.body)
    }
  }, [emailPreview])

  const handleSendEmails = async () => {
    if (!editableSubject.trim() || !editableBody.trim()) {
      toast({
        title: 'Error',
        description: 'Subject and body cannot be empty',
        variant: 'destructive',
      })
      return
    }

    try {
      await onSendEmails(editableSubject, editableBody)
      onOpenChange(false)
      setIsEditing(false)
    } catch (error) {
      console.error('Error sending emails:', error)
    }
  }

  const resetToOriginal = () => {
    if (emailPreview) {
      setEditableSubject(emailPreview.subject)
      setEditableBody(emailPreview.body)
      setIsEditing(false)
    }
  }

  if (!emailPreview && !isGenerating) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview - {seasonName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipients Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Recipients ({selectedParents.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedParents.slice(0, 10).map((parent) => (
                <Badge key={parent._id} variant="secondary" className="text-xs">
                  {parent.name}
                </Badge>
              ))}
              {selectedParents.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedParents.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Generating AI-powered email template...</span>
            </div>
          ) : emailPreview ? (
            <>
              {/* Payment Details */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">Payment Details</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <div className="font-medium">${emailPreview.paymentAmount}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Processing Fee:</span>
                    <div className="font-medium">${emailPreview.processingFee}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <div className="font-medium text-green-700">${emailPreview.totalAmount}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <div className="font-medium">{emailPreview.dueDate}</div>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Email Content</h3>
                  <div className="flex gap-2">
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToOriginal}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      {isEditing ? 'Preview' : 'Edit'}
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={editableSubject}
                        onChange={(e) => setEditableSubject(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="body">Email Body</Label>
                      <Textarea
                        id="body"
                        value={editableBody}
                        onChange={(e) => setEditableBody(e.target.value)}
                        rows={15}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Subject:</div>
                      <div className="font-medium">{editableSubject}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {editableBody}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Options Preview */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-900">Payment Options Included</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span>Online Payment (Stripe) - ${emailPreview.totalAmount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span>Pay at Facility - ${emailPreview.paymentAmount} (No fees)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmails}
                  disabled={isSending || !editableSubject.trim() || !editableBody.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending to {selectedParents.length} parents...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Emails to {selectedParents.length} Parents
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
