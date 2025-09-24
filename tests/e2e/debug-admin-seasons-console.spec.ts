import { test, expect } from '@playwright/test';

// Debug Admin Seasons page: capture console errors and detect error boundary

test('debug: admin/seasons console and error boundary', async ({ page }) => {
  const errors: any[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    // Always echo for CI logs
    // eslint-disable-next-line no-console
    console.log('[console]', msg.type(), msg.text());
  });

  await page.goto('/admin/seasons');

  // If ErrorBoundary shows fallback text
  const fallback = page.getByText(/something went wrong/i);
  const hasFallback = await fallback.isVisible().catch(() => false);

  // Basic smoke: page contains a header or known anchor
  const hasHeader = await page.getByRole('heading').first().isVisible().catch(() => false);

  // eslint-disable-next-line no-console
  console.log('Admin/Seasons fallback visible?', hasFallback, 'has any heading?', hasHeader);

  // Report errors if any
  if (errors.length) {
    // eslint-disable-next-line no-console
    console.log('Captured console errors:', errors);
  }

  // Assert page renders some heading and not the fallback
  expect.soft(hasFallback, 'Error boundary visible on admin/seasons').toBeFalsy();
  expect.soft(hasHeader, 'No headings rendered on admin/seasons').toBeTruthy();
});

