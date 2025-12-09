import Stripe from 'stripe';

// Only initialize Stripe if we have a secret key - allows builds to succeed without the key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripeInstance(): Stripe {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });
}

// Lazy initialization to avoid build-time errors
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  : (null as unknown as Stripe);

// Customer Management
export async function createStripeCustomer(parentData: {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}) {
  try {
    const customer = await stripe.customers.create({
      email: parentData.email,
      name: parentData.name,
      phone: parentData.phone,
      metadata: {
        source: 'rise_as_one',
        ...parentData.metadata,
      },
    });

    return {
      success: true,
      customer,
      customerId: customer.id,
    };
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    };
  }
}

export async function updateStripeCustomer(customerId: string, updateData: {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}) {
  try {
    const customer = await stripe.customers.update(customerId, updateData);
    return {
      success: true,
      customer,
    };
  } catch (error) {
    console.error('Stripe customer update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer',
    };
  }
}

// Payment Methods
export async function attachPaymentMethod(customerId: string, paymentMethodId: string) {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return {
      success: true,
      paymentMethodId,
    };
  } catch (error) {
    console.error('Payment method attach error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to attach payment method',
    };
  }
}

// Two-factor customer linking helpers (email + card fingerprint)
export async function getPaymentMethodFingerprint(pmId: string) {
  const pm = await stripe.paymentMethods.retrieve(pmId);
  const fingerprint = (pm?.card as any)?.fingerprint as string | undefined;
  return { pm, fingerprint };
}

export async function findCustomersByEmailAndFingerprint(email: string, fingerprint: string) {
  const all: Stripe.Customer[] = [];
  let startingAfter: string | undefined = undefined;
  // Paginate customers list by email (Stripe caps at 100/page)
  while (true) {
    const res = await stripe.customers.list({ email, limit: 100, starting_after: startingAfter });
    all.push(...res.data);
    if (!res.has_more) break;
    startingAfter = res.data[res.data.length - 1]?.id;
  }

  const exact: Stripe.Customer[] = [];
  for (const c of all) {
    // List up to 100 card payment methods for this customer
    const pms = await stripe.paymentMethods.list({ customer: c.id, type: 'card', limit: 100 });
    const hasMatch = pms.data.some((m) => ((m.card as any)?.fingerprint) === fingerprint);
    if (hasMatch) exact.push(c);
  }
  return exact;
}

async function pickMostRecentSuccessful(customers: Stripe.Customer[]) {
  let best = customers[0];
  let bestTs = 0;
  for (const c of customers) {
    const pis = await stripe.paymentIntents.list({ customer: c.id, limit: 10 });
    // Prefer latest succeeded; fall back to any latest
    const succeededTs = pis.data
      .filter((pi) => pi.status === 'succeeded')
      .map((pi) => pi.created)[0] || 0;
    const anyTs = pis.data[0]?.created || 0;
    const ts = Math.max(succeededTs, anyTs);
    if (ts > bestTs) {
      bestTs = ts;
      best = c;
    }
  }
  return best;
}

export async function ensureCustomerByEmailAndFingerprint(
  pmId: string,
  email: string,
  name?: string,
  phone?: string,
  metadata?: Record<string, string>
) {
  const { pm, fingerprint } = await getPaymentMethodFingerprint(pmId);
  if (!fingerprint) throw new Error('Missing card fingerprint on payment method');

  const exactMatches = await findCustomersByEmailAndFingerprint(email, fingerprint);
  let customer: Stripe.Customer;

  if (exactMatches.length === 1) {
    customer = exactMatches[0];
  } else if (exactMatches.length > 1) {
    customer = await pickMostRecentSuccessful(exactMatches);
  } else {
    // Email-only matches with different cards SHOULD NOT be linked; create new customer
    customer = await stripe.customers.create({ email, name, phone, metadata });
  }

  // Attach PM if not already attached to this customer
  if (pm.customer !== customer.id) {
    await stripe.paymentMethods.attach(pmId, { customer: customer.id });
  }

  // Set default payment method for future off-session charges
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: pmId },
  });

  return { customerId: customer.id, paymentMethodId: pmId };
}


// Subscription Management
export async function createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        source: 'rise_as_one',
        ...metadata,
      },
    });

    return {
      success: true,
      subscription,
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as Stripe.Invoice)?.payment_intent
        ? (subscription.latest_invoice.payment_intent as Stripe.PaymentIntent).client_secret
        : null,
    };
  } catch (error) {
    console.error('Subscription creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
}

// One-time Payment
export async function createPaymentIntent(amount: number, customerId: string, metadata?: Record<string, string>) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: 'rise_as_one',
        ...metadata,
      },
    });

    return {
      success: true,
      paymentIntent,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

// Invoice Management
export async function createInvoice(customerId: string, items: Array<{
  description: string;
  amount: number;
  quantity?: number;
}>, metadata?: Record<string, string>) {
  try {
    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100),
        currency: 'usd',
        description: item.description,
        quantity: item.quantity || 1,
      });
    }

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      metadata: {
        source: 'rise_as_one',
        ...metadata,
      },
    });

    await stripe.invoices.finalizeInvoice(invoice.id);

    return {
      success: true,
      invoice,
      invoiceId: invoice.id,
    };
  } catch (error) {
    console.error('Invoice creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

// Webhook Verification
export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

// Payment Status Helpers
export function getPaymentStatus(paymentIntent: Stripe.PaymentIntent): 'pending' | 'succeeded' | 'failed' | 'canceled' {
  switch (paymentIntent.status) {
    case 'succeeded':
      return 'succeeded';
    case 'canceled':
      return 'canceled';
    case 'payment_failed':
    case 'requires_payment_method':
      return 'failed';
    default:
      return 'pending';
  }
}

export function getSubscriptionStatus(subscription: Stripe.Subscription): 'active' | 'canceled' | 'past_due' | 'pending' {
  switch (subscription.status) {
    case 'active':
      return 'active';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    default:
      return 'pending';
  }
}

// Price and Product Management
export async function createProduct(name: string, description?: string) {
  try {
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        source: 'rise_as_one',
      },
    });

    return {
      success: true,
      product,
      productId: product.id,
    };
  } catch (error) {
    console.error('Product creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product',
    };
  }
}

export async function createPrice(productId: string, amount: number, interval?: 'month' | 'year') {
  try {
    const priceData: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        source: 'rise_as_one',
      },
    };

    if (interval) {
      priceData.recurring = {
        interval,
      };
    }

    const price = await stripe.prices.create(priceData);

    return {
      success: true,
      price,
      priceId: price.id,
    };
  } catch (error) {
    console.error('Price creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create price',
    };
  }
}

// Utility Functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}