// @ts-nocheck
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { convexHttp } from '@/lib/convex'
import { api } from '@/convex/_generated/api'

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        // Create user in Convex database
        await convexHttp.mutation(api.users.getOrCreateUser, {
          email: evt.data.email_addresses[0]?.email_address || '',
          firstName: evt.data.first_name || '',
          lastName: evt.data.last_name || '',
          role: evt.data.public_metadata?.role || 'user'
        })
        console.log(`User created: ${id}`)
        break

      case 'user.updated':
        // Update user in Convex database
        await convexHttp.mutation(api.users.updateUser, {
          email: evt.data.email_addresses[0]?.email_address,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          role: evt.data.public_metadata?.role || 'user'
        })
        console.log(`User updated: ${id}`)
        break

      case 'user.deleted':
        // Soft delete user in Convex database
        await convexHttp.mutation(api.users.updateUser, {
          isActive: false
        })
        console.log(`User deleted: ${id}`)
        break;

      default:
        console.log(`Unhandled Clerk webhook event: ${eventType}`)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error(`Error processing Clerk webhook ${eventType}:`, error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}