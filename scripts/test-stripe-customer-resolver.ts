/*
  Lightweight test runner for ensureCustomerByEmailAndFingerprint without real Stripe calls.
  Uses monkeypatching on the exported `stripe` instance.
*/

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_live_dummy';

(async () => {
  const { stripe, ensureCustomerByEmailAndFingerprint } = await import('../lib/stripe');

  type PaymentIntent = { id: string; status: 'succeeded'|'requires_payment_method'; created: number };
  type Customer = { id: string; email?: string };
  type PaymentMethod = { id: string; customer?: string; card?: { fingerprint?: string } };

  // Shared state to program response per scenario
  const state: any = {
    scenario: 'single-exact', // 'single-exact' | 'multi-exact' | 'email-only'
  };

  // Monkeypatch helpers
  const pmRetrieve = jestLike(async (pmId: string): Promise<PaymentMethod> => {
    return { id: pmId, customer: state.pmCustomer || null, card: { fingerprint: state.inputFingerprint || 'fp_123' } };
  });

  const customersList = jestLike(async (_args: any) => {
    const common = (email: string) => ({ id: '', email });
    if (state.scenario === 'single-exact') {
      return { data: [{ id: 'cus_A', email: state.email }], has_more: false };
    }
    if (state.scenario === 'multi-exact') {
      return { data: [{ id: 'cus_A', email: state.email }, { id: 'cus_B', email: state.email }], has_more: false };
    }
    // email-only (no fingerprint matches later)
    return { data: [{ id: 'cus_C', email: state.email }], has_more: false };
  });

  const pmsList = jestLike(async (args: any) => {
    const customer = args.customer as string;
    if (state.scenario === 'single-exact') {
      // cus_A has matching fp
      return { data: [{ id: 'pm_A1', card: { fingerprint: state.inputFingerprint } }] };
    }
    if (state.scenario === 'multi-exact') {
      if (customer === 'cus_A') return { data: [{ id: 'pm_A1', card: { fingerprint: state.inputFingerprint } }] };
      if (customer === 'cus_B') return { data: [{ id: 'pm_B1', card: { fingerprint: state.inputFingerprint } }] };
    }
    // email-only: different fingerprint
    return { data: [{ id: 'pm_C1', card: { fingerprint: 'fp_different' } }] };
  });

  const pisList = jestLike(async (args: any): Promise<{ data: PaymentIntent[] }> => {
    const customer = args.customer as string;
    if (state.scenario === 'multi-exact') {
      // Make cus_B more recent & succeeded
      if (customer === 'cus_A') return { data: [{ id: 'pi_old', status: 'succeeded', created: 1000 }] };
      if (customer === 'cus_B') return { data: [{ id: 'pi_new', status: 'succeeded', created: 2000 }] };
    }
    return { data: [] };
  });

  const pmAttachCalls: any[] = [];
  const pmAttach = jestLike(async (pmId: string, args: any) => {
    pmAttachCalls.push({ pmId, ...args });
    return { id: pmId };
  });

  const custUpdateCalls: any[] = [];
  const customersUpdate = jestLike(async (id: string, args: any) => {
    custUpdateCalls.push({ id, ...args });
    return { id };
  });

  const customersCreate = jestLike(async (args: any) => {
    return { id: 'cus_NEW', ...args };
  });

  // Apply monkeypatches
  // @ts-ignore
  stripe.paymentMethods.retrieve = pmRetrieve;
  // @ts-ignore
  stripe.customers.list = customersList;
  // @ts-ignore
  stripe.paymentMethods.list = pmsList;
  // @ts-ignore
  stripe.paymentIntents.list = pisList;
  // @ts-ignore
  stripe.paymentMethods.attach = pmAttach;
  // @ts-ignore
  stripe.customers.update = customersUpdate;
  // @ts-ignore
  stripe.customers.create = customersCreate;

  // Simple assert helper
  function assert(condition: any, message: string) {
    if (!condition) throw new Error('Assertion failed: ' + message);
  }

  function logPass(name: string) {
    console.log('PASS -', name);
  }

  // Scenario 1: single exact match
  state.scenario = 'single-exact';
  state.inputFingerprint = 'fp_123';
  state.email = 'user@example.com';
  pmAttachCalls.length = 0; custUpdateCalls.length = 0;
  {
    const res = await ensureCustomerByEmailAndFingerprint('pm_input', state.email, 'User');
    assert(res.customerId === 'cus_A', 'should pick cus_A');
    assert(res.paymentMethodId === 'pm_input', 'should return input pm');
    assert(custUpdateCalls.find(x => x.id === 'cus_A' && x.invoice_settings?.default_payment_method === 'pm_input'), 'should set default pm');
    logPass('single exact match selects existing customer and sets default PM');
  }

  // Scenario 2: multiple exact matches -> most recent succeeded PI
  state.scenario = 'multi-exact';
  pmAttachCalls.length = 0; custUpdateCalls.length = 0;
  {
    const res = await ensureCustomerByEmailAndFingerprint('pm_input', state.email, 'User');
    assert(res.customerId === 'cus_B', 'should pick cus_B with most recent succeeded PI');
    logPass('multi exact matches selects most recent active customer');
  }

  // Scenario 3: email-only (different card) -> create new customer
  state.scenario = 'email-only';
  pmAttachCalls.length = 0; custUpdateCalls.length = 0;
  {
    const res = await ensureCustomerByEmailAndFingerprint('pm_input', state.email, 'User');
    assert(res.customerId === 'cus_NEW', 'should create new customer when only email matches with different card');
    logPass('email-only creates new customer');
  }

  console.log('All resolver tests passed.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Minimal jest-like wrapper to label patches
function jestLike<T extends Function>(fn: T): T { return fn; }

