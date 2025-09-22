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
    <div>
      <p>Email Preview Dialog - {seasonName}</p>
      <p>Recipients: {selectedParents.length}</p>
      {emailPreview && (
        <div>
          <p>Subject: {emailPreview.subject}</p>
          <p>Amount: ${emailPreview.paymentAmount}</p>
        </div>
      )}
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  )
}
