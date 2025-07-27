
'use client'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">RA1 Dashboard</h1>
            <nav className="hidden md:flex space-x-6">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/parents" className="text-gray-600 hover:text-gray-900">Parents</a>
              <a href="/payments" className="text-gray-600 hover:text-gray-900">Payments</a>
              <a href="/communication" className="text-gray-600 hover:text-gray-900">Communication</a>
              <a href="/contracts" className="text-gray-600 hover:text-gray-900">Contracts</a>
              <a href="/settings" className="text-gray-600 hover:text-gray-900">Settings</a>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  )
}
