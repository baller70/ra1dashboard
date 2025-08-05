export default function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">RA1 Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Total Parents</h3>
          <p className="text-2xl font-bold text-blue-600">5</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Total Revenue</h3>
          <p className="text-2xl font-bold text-green-600">$9,900</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Pending Payments</h3>
          <p className="text-2xl font-bold text-yellow-600">$9,167</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Overdue Payments</h3>
          <p className="text-2xl font-bold text-red-600">2</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Active Templates</h3>
          <p className="text-2xl font-bold text-purple-600">5</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-gray-900">Messages Sent</h3>
          <p className="text-2xl font-bold text-indigo-600">6</p>
        </div>
      </div>
    </div>
  )
}