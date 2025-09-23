import { APIRequestContext, expect } from '@playwright/test';

export async function getKevinParent(request: APIRequestContext) {
  const res = await request.get('/api/parents?search=' + encodeURIComponent('Kevin Houston') + '&limit=1');
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  const parent = json?.data?.parents?.[0];
  expect(parent, 'Kevin parent not found').toBeTruthy();
  return parent;
}

export async function getPaymentsForParent(request: APIRequestContext, parentId: string) {
  const res = await request.get(`/api/payments?parentId=${encodeURIComponent(parentId)}&limit=25`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return json?.data?.payments || [];
}

export function pickPaymentForOneTime(payments: any[]) {
  if (!Array.isArray(payments)) return null;
  // Prefer a pending/overdue payment; else the first one
  const pending = payments.find((p: any) => (p.status || '').toLowerCase() === 'pending');
  const overdue = payments.find((p: any) => (p.status || '').toLowerCase() === 'overdue');
  return pending || overdue || payments[0] || null;
}

