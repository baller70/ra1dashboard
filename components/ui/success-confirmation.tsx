'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Mail, MessageSquare, X } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

interface SuccessConfirmationProps {
  isVisible: boolean
  onClose: () => void
  title: string
  message: string
  method?: 'email' | 'sms'
  parentName?: string
  amount?: number
  duration?: number
}

export function SuccessConfirmation({
  isVisible,
  onClose,
  title,
  message,
  method = 'email',
  parentName,
  amount,
  duration = 5000
}: SuccessConfirmationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onClose, 300) // Allow fade out animation
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-800">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShow(false)
                  setTimeout(onClose, 300)
                }}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">
              {message}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                {method === 'email' ? (
                  <Mail className="h-3 w-3" />
                ) : (
                  <MessageSquare className="h-3 w-3" />
                )}
                {method.toUpperCase()}
              </Badge>
              
              {parentName && (
                <Badge variant="secondary">
                  To: {parentName}
                </Badge>
              )}
              
              {amount && (
                <Badge variant="outline">
                  ${amount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 