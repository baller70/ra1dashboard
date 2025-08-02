'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserSession {
  user: User | null
  preferences: Record<string, any>
  sessionData: Record<string, any>
  isLoading: boolean
  updatePreferences: (preferences: Record<string, any>) => Promise<void>
  updateSessionData: (data: Record<string, any>) => Promise<void>
  refreshSession: () => Promise<void>
}

const UserSessionContext = createContext<UserSession | undefined>(undefined)

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [preferences, setPreferences] = useState<Record<string, any>>({})
  const [sessionData, setSessionData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/session')
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setPreferences(data.preferences || {})
        setSessionData(data.sessionData || {})
      } else {
        console.log('No active session')
        setUser(null)
        setPreferences({})
        setSessionData({})
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
      setUser(null)
      setPreferences({})
      setSessionData({})
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = async (newPreferences: Record<string, any>) => {
    try {
      const response = await fetch('/api/user/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: newPreferences,
        }),
      })

      if (response.ok) {
        setPreferences(prev => ({ ...prev, ...newPreferences }))
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      throw error
    }
  }

  const updateSessionData = async (newData: Record<string, any>) => {
    try {
      const response = await fetch('/api/user/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData: newData,
        }),
      })

      if (response.ok) {
        setSessionData(prev => ({ ...prev, ...newData }))
      } else {
        throw new Error('Failed to update session data')
      }
    } catch (error) {
      console.error('Failed to update session data:', error)
      throw error
    }
  }

  const refreshSession = async () => {
    await fetchSession()
  }

  useEffect(() => {
    fetchSession()
  }, [])

  const value: UserSession = {
    user,
    preferences,
    sessionData,
    isLoading,
    updatePreferences,
    updateSessionData,
    refreshSession,
  }

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  )
}

export function useUserSession() {
  const context = useContext(UserSessionContext)
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider')
  }
  return context
}

// Custom hook for preferences
export function useUserPreferences() {
  const { preferences, updatePreferences } = useUserSession()
  return { preferences, updatePreferences }
}

// Custom hook for session data
export function useSessionData() {
  const { sessionData, updateSessionData } = useUserSession()
  return { sessionData, updateSessionData }
} 