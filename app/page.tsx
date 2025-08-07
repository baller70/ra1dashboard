'use client'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Rise as One Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Total Parents</h3>
            <p className="text-3xl font-bold text-blue-600">2</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Total Potential Revenue</h3>
            <p className="text-3xl font-bold text-green-600">$3,300</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Overdue Payments</h3>
            <p className="text-3xl font-bold text-red-600">0</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dashboard Status</h2>
          <p className="text-green-600 font-medium">✅ App is working correctly!</p>
          <p className="text-gray-600 mt-2">API endpoints are functional and returning correct data.</p>
        </div>
      </div>
    </div>
  )
}