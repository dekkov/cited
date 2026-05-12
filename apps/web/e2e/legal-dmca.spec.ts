import { test, expect } from '@playwright/test';

test('/legal/dmca renders heading + SLA + contact', async ({ page }) => {
  await page.goto('/legal/dmca');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DMCA Takedown Requests');
  await expect(page.getByText('48 hours')).toBeVisible();
  await expect(page.getByText(/dmca@/)).toBeVisible();
});
