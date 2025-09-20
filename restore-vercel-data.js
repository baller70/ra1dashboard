const { ConvexHttpClient } = require('convex/browser')

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || 'https://confident-wildcat-124.convex.cloud')

// Real payment data from Vercel deployment
const realPaymentData = [
  {
    "amount": 1650,
    "dueDate": 1754524800000,
    "notes": "Payment plan created - First installment of $183.33 automatically processed and PAID",
    "paidAt": 1754744292902,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "paid"
  },
  {
    "amount": 1,
    "dueDate": 1758296444468,
    "notes": "admin test mark paid",
    "paidAt": 1758299432510,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "paid"
  },
  {
    "amount": 100,
    "dueDate": 1758307525814,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 100,
    "dueDate": 1758307790297,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 9000,
    "dueDate": 1758313845484,
    "notes": "Payment plan created - First installment of $1000 automatically processed and PAID",
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 150,
    "dueDate": 1758340045379,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 150,
    "dueDate": 1758340119462,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 150,
    "dueDate": 1758340245768,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 150,
    "dueDate": 1758340369227,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  },
  {
    "amount": 150,
    "dueDate": 1758341506336,
    "parentEmail": "khouston721@gmail.com",
    "parentName": "Kevin Houston",
    "paymentMethod": "stripe_card",
    "remindersSent": 0,
    "status": "pending"
  }
]

async function restoreVercelData() {
  try {
    console.log('🔄 Starting Vercel data restoration...')
    
    // First, get the existing Kevin Houston parent ID
    const response = await fetch('http://localhost:3000/api/parents')
    const parentsData = await response.json()
    
    if (!parentsData.success || !parentsData.data.parents.length) {
      console.error('❌ No parents found in local database')
      return
    }
    
    const kevinHouston = parentsData.data.parents.find(p => p.name === 'Kevin Houston')
    if (!kevinHouston) {
      console.error('❌ Kevin Houston not found in local database')
      return
    }
    
    console.log('✅ Found Kevin Houston:', kevinHouston._id)
    
    // Clear existing payments
    console.log('🗑️ Clearing existing payments...')
    const clearResponse = await fetch('http://localhost:3000/api/payments/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'ra1-dashboard-api-key-2024'
      }
    })
    
    if (clearResponse.ok) {
      console.log('✅ Existing payments cleared')
    }
    
    // Create new payments with real data
    console.log('💰 Creating payments from Vercel data...')
    let successCount = 0
    
    for (const paymentData of realPaymentData) {
      try {
        const createResponse = await fetch('http://localhost:3000/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'ra1-dashboard-api-key-2024'
          },
          body: JSON.stringify({
            ...paymentData,
            parentId: kevinHouston._id,
            dueDate: new Date(paymentData.dueDate).toISOString(),
            paidAt: paymentData.paidAt ? new Date(paymentData.paidAt).toISOString() : null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        })
        
        if (createResponse.ok) {
          const result = await createResponse.json()
          console.log(`✅ Created payment: $${paymentData.amount} (${paymentData.status})`)
          successCount++
        } else {
          const error = await createResponse.text()
          console.error(`❌ Failed to create payment $${paymentData.amount}:`, error)
        }
      } catch (error) {
        console.error(`❌ Error creating payment $${paymentData.amount}:`, error.message)
      }
    }
    
    console.log(`\n🎉 Restoration complete! Created ${successCount}/${realPaymentData.length} payments`)
    console.log('🔗 Visit http://localhost:3000/payments to see your restored data')
    
  } catch (error) {
    console.error('❌ Restoration failed:', error)
  }
}

restoreVercelData()
