'use client'

export default function MinimalDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">RA1 Dashboard - Minimal</h1>
        </div>
      </header>
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Minimal version for testing build</p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="font-semibold">Total Parents</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="font-semibold">Total Revenue</h3>
              <p className="text-2xl font-bold">$0</p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="font-semibold">Active Plans</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 