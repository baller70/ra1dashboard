import { test, expect, request } from '@playwright/test';

const PARENT_ID = process.env.E2E_PARENT_ID || 'j971g9n5ve0qqsby21a0k9n1js7n7tbx'; // Kevin Houston

async function apiClient(baseURL: string) {
  return await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

async function createPendingPayment(api: any, amountCents: number) {
  const dueDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const res = await api.post('/api/payments', {
    data: { parentId: PARENT_ID, amount: amountCents, dueDate, notes: 'E2E AI reminder test' },
  });
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return json.data._id as string;
}

// Verify that the AI Generate Reminder uses the custom prompt and shows it in the generated message.
// We accept either real AI output or fallback synthesis (when OPENAI_API_KEY is not provided),
// but the final message must reflect a key element from the prompt (e.g., "Saturday").

test('AI reminder honors custom prompt and displays influenced message', async ({ page, baseURL }) => {
  const api = await apiClient(baseURL!);

  // 1) Create a pending payment to have a payment profile page
  const amount = 150; // $1.50
  const paymentId = await createPendingPayment(api, amount);

  // 2) Go to the payment profile page
  await page.goto(`/payments/${paymentId}`);

  // 3) Fill the custom prompt and trigger AI generation
  const prompt = 'Be firm but supportive. Mention upcoming game on Saturday. Keep it under 30 words.';
  const promptTextarea = page.getByPlaceholder(/Be firm but supportive\. Mention upcoming game on Saturday\./i);
  await promptTextarea.fill(prompt);

  await page.getByRole('button', { name: /AI Generate Reminder/i }).click();

  // 4) Wait for dialog and generated message
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Payment Reminder - AI & Templates/i)).toBeVisible();

  const aiMessageTextarea = dialog.getByRole('textbox');
  await expect(aiMessageTextarea).toBeVisible();
  // Wait until generation completes and content appears
  await expect(aiMessageTextarea).toBeEnabled({ timeout: 20000 });
  await expect(aiMessageTextarea).not.toHaveValue('', { timeout: 20000 });

  // 5) Validate that message reflects the prompt (contains "Saturday")
  const value = await aiMessageTextarea.inputValue();
  expect(/saturday/i.test(value)).toBeTruthy();

  // 6) Soft-check approximate word limit (allow some buffer)
  const words = value.trim().split(/\s+/);
  expect(words.length).toBeLessThanOrEqual(45);
});

