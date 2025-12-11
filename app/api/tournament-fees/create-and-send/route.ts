export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      season, 
      name, 
      amount, 
      dueDate, 
      feeType,
      parents, 
      messageSubject, 
      messageTemplate 
    } = body

    if (!season || !name || !amount || !dueDate || !parents?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const results = {
      created: 0,
      sent: 0,
      errors: [] as string[]
    }

    // Process each parent
    for (const parent of parents) {
      try {
        // Create Stripe payment link
        let paymentLink = ''
        try {
          // Create or get Stripe customer
          let customerId = null
          const existingParent = await prisma.parents.findUnique({
            where: { id: parent.id }
          })
          
          if (existingParent?.stripeCustomerId) {
            customerId = existingParent.stripeCustomerId
          } else {
            const customer = await stripe.customers.create({
              email: parent.email,
              name: parent.name,
              metadata: {
                parentId: parent.id,
                childName: parent.childName || ''
              }
            })
            customerId = customer.id
            
            // Update parent with Stripe customer ID
            await prisma.parents.update({
              where: { id: parent.id },
              data: { stripeCustomerId: customerId }
            })
          }

          // Create checkout session for this fee
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: name,
                  description: `Tournament Fee - ${season}`,
                },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments`,
            metadata: {
              parentId: parent.id,
              feeType: 'tournament',
              feeName: name,
              season: season
            }
          })

          paymentLink = session.url || ''
        } catch (stripeError) {
          console.error('Stripe error for parent:', parent.id, stripeError)
          paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/pay?parentId=${parent.id}&amount=${amount}&fee=${encodeURIComponent(name)}`
        }

        // Create fee record in database (using league_fees table with feeType distinction)
        const feeRecord = await prisma.league_fees.create({
          data: {
            id: `tfee_${Date.now()}_${parent.id.slice(-6)}`,
            parentId: parent.id,
            amount: amount,
            status: 'pending',
            dueDate: new Date(dueDate),
            remindersSent: 1,
            lastReminderSent: new Date(),
            notes: JSON.stringify({
              feeName: name,
              feeType: 'tournament',
              season: season,
              childName: parent.childName,
              paymentLink: paymentLink
            }),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        results.created++

        // Generate personalized message
        const personalizedMessage = messageTemplate
          .replace(/{parentName}/g, parent.name)
          .replace(/{childName}/g, parent.childName || parent.name.split(' ')[0])
          .replace(/{amount}/g, amount.toString())
          .replace(/{dueDate}/g, new Date(dueDate).toLocaleDateString())
          .replace(/{paymentLink}/g, paymentLink)

        // Send email
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/messages`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': 'ra1-dashboard-api-key-2024'
            },
            body: JSON.stringify({
              parentId: parent.id,
              parentEmail: parent.email,
              parentName: parent.name,
              subject: messageSubject,
              content: personalizedMessage,
              type: 'tournament_fee_reminder',
              method: 'email'
            })
          })

          if (emailResponse.ok) {
            results.sent++
          } else {
            results.errors.push(`Failed to send email to ${parent.email}`)
          }
        } catch (emailError) {
          console.error('Email error for parent:', parent.id, emailError)
          results.errors.push(`Email error for ${parent.email}`)
        }

      } catch (parentError: any) {
        console.error('Error processing parent:', parent.id, parentError)
        results.errors.push(`Error for ${parent.name}: ${parentError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.created} tournament fees and sent ${results.sent} reminders`,
      results
    })

  } catch (error: any) {
    console.error('Create and send tournament fees error:', error)
    return NextResponse.json(
      { error: 'Failed to create and send tournament fees', details: error.message },
      { status: 500 }
    )
  }
}

