'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Textarea } from './textarea'
import { Input } from './input'
import { Label } from './label'
import { Badge } from './badge'
import { useToast } from '../../hooks/use-toast'
import { Mail, Users, Edit3, Send, DollarSign, CreditCard, Building2 } from 'lucide-react'

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

export function LeagueFeeEmailPreviewDialog(props: LeagueFeeEmailPreviewDialogProps) {
  const {
    open,
    onOpenChange,
    selectedParents,
    seasonName,
    emailPreview,
    onSendEmails,
    isSending,
    isGenerating
  } = props

  const [editableSubject, setEditableSubject] = useState('')
  const [editableBody, setEditableBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Label className="text-sm font-medium">Recipients ({selectedParents.length})</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedParents.slice(0, 10).map((parent) => (
                <Badge key={parent._id} variant="secondary" className="text-xs">
                  {parent.name}
                </Badge>
              ))}
              {selectedParents.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedParents.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          {/* Payment Details Section */}
          {emailPreview && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <Label className="text-sm font-medium">Payment Details</Label>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">League Fee:</span>
                  <span className="ml-2 font-medium">${emailPreview.paymentAmount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Processing Fee:</span>
                  <span className="ml-2 font-medium">${emailPreview.processingFee}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="ml-2 font-medium">${emailPreview.totalAmount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2 font-medium">{emailPreview.dueDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Email Content Section */}
          {emailPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Email Content</Label>
                <div className="flex gap-2">
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    {isEditing ? "Preview" : "Edit"}
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToOriginal}
                      className="text-xs"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs text-gray-600">Subject</Label>
                {isEditing ? (
                  <Input
                    id="subject"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                    className="font-medium"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded border font-medium">
                    {editableSubject}
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <Label htmlFor="body" className="text-xs text-gray-600">Email Body</Label>
                {isEditing ? (
                  <Textarea
                    id="body"
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    rows={12}
                    className="resize-none"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded border whitespace-pre-wrap text-sm">
                    {editableBody}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating email preview...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            {emailPreview && (
              <Button
                onClick={handleSendEmails}
                disabled={isSending || !editableSubject.trim() || !editableBody.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Emails...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Emails to {selectedParents.length} Parent{selectedParents.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
