'use client'

import { useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export function VoiceChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('Tap to speak with Riley')
  const [messages, setMessages] = useState<Message[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const voiceServerUrl = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3333'
    : 'https://kevins-mac-mini.tailc5323b.ts.net'

  const toggleRecording = async () => {
    if (isProcessing) return
    
    if (!isRecording) {
      // Check for secure context
      if (typeof window !== 'undefined' && 
          window.location.protocol === 'http:' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1') {
        setStatus('Error: Use localhost for microphone')
        alert('Microphone requires localhost or HTTPS.\n\nUse: http://localhost:3005')
        return
      }
      
      try {
        setStatus('Requesting microphone...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []
        
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
        mediaRecorder.onstop = processAudio
        
        mediaRecorder.start()
        setIsRecording(true)
        setStatus('Listening... tap to stop')
      } catch (err: any) {
        console.error('Mic error:', err)
        setStatus('Mic error: ' + (err?.message || 'Denied'))
        alert('Microphone access denied.\n\nMake sure you\'re using localhost:3005')
      }
    } else {
      mediaRecorderRef.current?.stop()
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      setIsProcessing(true)
      setStatus('Processing...')
    }
  }

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('mode', 'fast')
    formData.append('division', 'rise-as-one')
    
    try {
      setStatus('Transcribing...')
      const response = await fetch(`${voiceServerUrl}/process`, {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.error) {
        setStatus('Error: ' + data.error)
      } else {
        if (data.transcript) {
          setMessages(prev => [...prev, { role: 'user', text: data.transcript }])
        }
        if (data.response) {
          setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
        }
        setStatus('Tap to speak')
      }
    } catch (err: any) {
      console.error('Process error:', err)
      setStatus('Connection error')
    }
    
    setIsProcessing(false)
  }

  // Mic Icon SVG
  const MicIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V20h4v2H8v-2h4v-4.07z"/>
    </svg>
  )
  
  // Message Icon SVG
  const MessageIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  )
  
  // Close Icon SVG
  const CloseIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
        title="Talk to Riley"
      >
        <MessageIcon />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MicIcon />
          </div>
          <div>
            <div className="text-white font-semibold">Riley</div>
            <div className="text-orange-100 text-xs">Rise As One Assistant</div>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>
      
      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              <MicIcon />
            </div>
            <p className="text-sm">Tap the mic to ask about<br/>teams, payments, or rosters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-100 text-orange-900 ml-8'
                    : 'bg-white border border-gray-200 mr-8'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${msg.role === 'user' ? 'text-orange-700' : 'text-gray-500'}`}>
                  {msg.role === 'user' ? 'You' : 'Riley'}
                </div>
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="text-xs text-gray-500 text-center mb-3">{status}</div>
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          <MicIcon />
          {isRecording ? 'Stop Recording' : isProcessing ? 'Processing...' : 'Speak'}
        </button>
      </div>
    </div>
  )
}
