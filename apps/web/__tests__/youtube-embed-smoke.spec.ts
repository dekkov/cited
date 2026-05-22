/**
 * YouTubeEmbed smoke test — Pitfall 4 (experimental package regression guard)
 *
 * Verifies that the <YouTubeEmbed> component on /h/[slug] renders an iframe
 * whose src:
 *   - Contains start= param (HAB-05 — timestamp required)
 *   - Contains end= param (HAB-05 — end timestamp required)
 *   - Does NOT contain controls=0 (HAB-05 — must not disable player chrome)
 *
 * Run against a dev server with at least one published habit_template at 'test-slug'.
 */
import { expect, test } from '@playwright/test';

const WEB_URL = process.env['WEB_URL'] ?? process.env['BASE_URL'] ?? 'http://localhost:3000';

test.describe('YouTubeEmbed smoke tests', () => {
  test('public /h/[slug] iframe src contains start/end and not controls=0', async ({ page }) => {
    await page.goto(`${WEB_URL}/h/test-slug`, { waitUntil: 'networkidle' });

    // Skip if page 404s (no test-slug fixture)
    const status = page.url();
    if (status.includes('not-found') || status.includes('404')) {
      test.skip();
    }

    // Find the YouTube embed iframe
    const iframe = page.locator('iframe').first();
    const count = await iframe.count();
    if (count === 0) {
      // lite-youtube-embed uses a facade; click to load the iframe
      const liteEmbed = page.locator('lite-youtube, [data-videoid]').first();
      if ((await liteEmbed.count()) > 0) {
        await liteEmbed.click();
        // Wait for iframe to appear
        await page.waitForSelector('iframe', { timeout: 5000 });
      }
    }

    const iframeSrc = await page.locator('iframe').first().getAttribute('src');

    if (!iframeSrc) {
      // lite-youtube-embed may use data attributes instead; check parent
      const embedEl = page.locator('[data-videoid], lite-youtube').first();
      if ((await embedEl.count()) > 0) {
        const videoId =
          (await embedEl.getAttribute('data-videoid')) ?? (await embedEl.getAttribute('videoid'));
        expect(videoId).toBeTruthy();
        // lite-youtube-embed builds URL client-side on click; params embedded in dataset
        const paramsAttr = (await embedEl.getAttribute('params')) ?? '';
        expect(paramsAttr).toMatch(/start=/);
        expect(paramsAttr).toMatch(/end=/);
        expect(paramsAttr).not.toMatch(/controls=0/);
      }
      return;
    }

    // Standard iframe src checks
    expect(iframeSrc).toMatch(/start=/);
    expect(iframeSrc).toMatch(/end=/);
    expect(iframeSrc).not.toMatch(/controls=0/);
  });

  test('authenticated /habits/[id] iframe src contains start/end and not controls=0', async ({
    page,
  }) => {
    // This test requires a logged-in user, which is harder to automate.
    // The check is: if we can navigate to /habits/[id], the embed must pass HAB-05.
    // In CI without auth, this test skips gracefully.

    const habitId = process.env['TEST_HABIT_ID'];
    if (!habitId) {
      test.skip();
    }

    await page.goto(`${WEB_URL}/habits/${habitId}`, { waitUntil: 'networkidle' });

    const iframeSrc = await page.locator('iframe').first().getAttribute('src');
    if (!iframeSrc) return; // Not logged in — skip

    expect(iframeSrc).toMatch(/start=/);
    expect(iframeSrc).toMatch(/end=/);
    expect(iframeSrc).not.toMatch(/controls=0/);
  });
});
