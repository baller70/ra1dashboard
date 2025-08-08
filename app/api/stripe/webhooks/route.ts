import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No stripe-signature header value was provided.' }, { status: 400 });
  }

  const body = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const parentId = subscription.metadata.parentId;
          
          if (parentId) {
            const paymentPlan = await convex.query(api.payments.getPaymentPlanByParentId, { parentId });
            if (paymentPlan) {
              await convex.mutation(api.payments.createPayment, {
                parentId,
                paymentPlanId: paymentPlan._id,
                amount: invoice.amount_paid / 100,
                dueDate: new Date(invoice.period_end * 1000).getTime(),
                status: 'paid',
                stripeInvoiceId: invoice.id,
              });
            }
          }
        }
        break;
      
      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription;
        await convex.mutation(api.parents.updateParent, {
          id: subscription.metadata.parentId as any,
          stripeSubscriptionId: subscription.id,
        });
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed. View logs.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
