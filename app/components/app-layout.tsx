
'use client'

import { useState } from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">RA1 Dashboard</h1>
            <div className="flex items-center">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/parents" className="text-gray-600 hover:text-gray-900">Parents</a>
                <a href="/payments" className="text-gray-600 hover:text-gray-900">Payments</a>
                <a href="/communication" className="text-gray-600 hover:text-gray-900">Communication</a>
                <a href="/contracts" className="text-gray-600 hover:text-gray-900">Contracts</a>
                <a href="/assessments" className="text-gray-600 hover:text-gray-900">Assessment</a>
                <a href="/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
              </nav>
              {/* Mobile Menu Button */}
              <button
                aria-label="Toggle menu"
                className="md:hidden ml-3 inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {mobileOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <>
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
          {/* Mobile Navigation */}
          {mobileOpen && (
            <nav className="md:hidden mt-3 grid gap-1">
              <a href="/" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Dashboard</a>
              <a href="/parents" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Parents</a>
              <a href="/payments" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Payments</a>
              <a href="/communication" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Communication</a>
              <a href="/contracts" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Contracts</a>
              <a href="/assessments" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Assessment</a>
              <a href="/settings" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100">Settings</a>
            </nav>
          )}
        </div>
      </header>
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  )
}
