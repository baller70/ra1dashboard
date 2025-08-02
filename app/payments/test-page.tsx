'use client'

import { useState } from 'react'

export default function TestPaymentsPage() {
  const [activeProgram] = useState('yearly-program')
  
  // 🎯 DUMMY PARENT DATA FOR TESTING
  const dummyParents = [
    { _id: "parent1", name: "Sarah Chen", email: "sarah.chen@email.com", phone: "+1-555-0101" },
    { _id: "parent2", name: "Marcus Johnson", email: "marcus.johnson@email.com", phone: "+1-555-0201" },
    { _id: "parent3", name: "Jennifer Williams", email: "jennifer.williams@email.com", phone: "+1-555-0301" },
    { _id: "parent4", name: "David Rodriguez", email: "david.rodriguez@email.com", phone: "+1-555-0401" },
    { _id: "parent5", name: "Lisa Thompson", email: "lisa.thompson@email.com", phone: "+1-555-0501" }
  ]

  // 🎯 CREATE DUMMY PAYMENTS WITH PARENT DATA FOR TESTING
  const dummyPaymentsWithParents = [
    {
      _id: "payment1",
      parent: dummyParents[0],
      amount: 130.42,
      status: "paid",
      dueDate: Date.now() - 86400000, // Yesterday
      paidAt: Date.now() - 3600000,
      program: activeProgram,
      paymentPlan: { _id: "plan1", type: "monthly" }
    },
    {
      _id: "payment2", 
      parent: dummyParents[1],
      amount: 150.00,
      status: "pending",
      dueDate: Date.now() + 86400000, // Tomorrow
      paidAt: null,
      program: activeProgram,
      paymentPlan: { _id: "plan2", type: "monthly" }
    },
    {
      _id: "payment3",
      parent: dummyParents[2], 
      amount: 175.50,
      status: "overdue",
      dueDate: Date.now() - 172800000, // 2 days ago
      paidAt: null,
      program: activeProgram,
      paymentPlan: { _id: "plan3", type: "monthly" }
    },
    {
      _id: "payment4",
      parent: dummyParents[3],
      amount: 200.00, 
      status: "paid",
      dueDate: Date.now() - 259200000, // 3 days ago
      paidAt: Date.now() - 86400000,
      program: activeProgram,
      paymentPlan: { _id: "plan4", type: "monthly" }
    },
    {
      _id: "payment5",
      parent: dummyParents[4],
      amount: 125.75,
      status: "pending", 
      dueDate: Date.now() + 172800000, // In 2 days
      paidAt: null,
      program: activeProgram,
      paymentPlan: { _id: "plan5", type: "monthly" }
    }
  ]

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">🎯 TEST PAYMENTS PAGE</h1>
      
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <h2 className="font-bold text-lg mb-2">🔍 DEBUG INFO:</h2>
        <p>Total dummy payments: {dummyPaymentsWithParents.length}</p>
        <p>Active program: {activeProgram}</p>
      </div>

      <div className="grid gap-4">
        <h2 className="text-2xl font-semibold">Payment List:</h2>
        {dummyPaymentsWithParents.map((payment) => (
          <div key={payment._id} className="p-4 border rounded-lg bg-white shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{payment.parent.name}</h3>
                <p className="text-gray-600">{payment.parent.email}</p>
                <p className="text-gray-600">{payment.parent.phone}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${payment.amount}</div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${
                  payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {payment.status.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Due: {new Date(payment.dueDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 