---
status: complete
phase: 03-user-ai-loop-the-demo
source:
  - 03-01-schema-foundations-SUMMARY.md
  - 03-02-hybrid-retrieval-grounding-SUMMARY.md
  - 03-03-interview-synthesis-api-SUMMARY.md
  - 03-04-onboarding-ui-SUMMARY.md
  - 03-05-dashboard-checkin-graduation-SUMMARY.md
  - 03-06-habit-detail-public-swap-SUMMARY.md
started: 2026-05-24T00:00:00Z
updated: 2026-05-24T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill running server. Run seed + cluster scripts from clean state. Server boots without errors, both scripts complete, login + /dashboard reachable.
result: pass

### 2. Onboarding interview flow
expected: After login, /onboarding/interview presents about-you textarea → "Personalising your questions…" → 8 chip questions (4 chips each) + optional expander → "Generate recommendations" → submitting spinner → /onboarding/recommendations.
result: pass

### 3. AdoptBoard recommendations surface
expected: 3 horizontal habit cards visible. Each card has Adopt + Swap buttons. Swap pulls next from queue. Adopted habits appear in "Your starting set" with remove option. Counter updates. "Progress to Dashboard" disabled until ≥1 adopted; enabled afterwards.
result: pass

### 4. Dashboard consistency-primary HabitCards
expected: /dashboard shows one HabitCard per adopted habit. Consistency bar (21 cells) is the largest visual; streak counter is secondary below it. Missed days render as warm muted neutral (paper-3), never red. Streak hides when length ≥30.
result: pass

### 5. Tri-state check-in flow
expected: Tapping check-in on a HabitCard opens a bottom sheet with Done / Partial / Skip. Optional mood pills (1-5) and an expandable note field. Submitting records the check-in and updates the consistency bar + streak. Re-checking the same day is rejected.
result: pass

### 6. Habit detail page (/habits/[id])
expected: Back-to-dashboard link at top. Domain badge, title, italic block-quoted claim with sage opening-quote, named speaker + Verified pill, episode title + date, YouTube embed (start/end timestamps, player chrome visible — no controls=0), "Watch on Diary of a CEO ↗" CTA. Swap + Remove buttons present.
result: pass
notes: |
  Initial render had four layout regressions surfaced during verification —
  fixed inline this UAT session before final pass:
    - YouTube embed cropped (fixed 200px height) → switched to aspect-video (16:9)
    - Block-quote opening glyph absolutely positioned, overlapped/clipped by the
      green bar → moved inline at the start of the italic text flow
    - Swap + Remove rendered on separate lines (space-y-3) → flex-row gap-3
    - Remove button was ghost-styled with no border → outline variant, red border
      + red text + red hover, matching SwapPanel's visual weight

### 7. Equivalent-benefit swap flow
expected: "Swap this habit" opens a right-side Sheet with reason chips (Too hard / Doesn't resonate / Schedule conflict / Other). After selecting + "Find alternatives", 1-2 alternative candidates appear, each with title + cited claim + ≥2 validated citations. "Use this instead" replaces the habit; dashboard reflects the new one.
result: pass

### 8. Today's check-in cleared after swap
expected: Check in a habit, then swap it. New habit card on dashboard shows UNCHECKED for today (you did the old habit, not the new one). Streak is rolled back by today's contribution. Re-checking the new habit today increments normally (no double-increment).
result: pass

### 9. Remove habit flow
expected: "Remove this habit" on /habits/[id] shows a confirm prompt. "Confirm remove" redirects to /dashboard. The removed habit is no longer in the active list. Past check-ins for the habit are preserved (not lost).
result: pass

### 10. Public /h/[slug] page (anon, non-supplement)
expected: Open `/h/cool-bedroom-deep-sleep` in an incognito window. Rich editorial: claim, speaker, episode context, YouTube embed, both CTAs. View-source contains NO `<meta name="robots" content="noindex">` and no user-data strings. Page reachable without login.
result: pass

### 11. Public /h/[slug] supplement page (noindex + sitemap exclusion)
expected: Open `/h/daily-creatine-cognition` in incognito. View-source contains `<meta name="robots" content="noindex">`. Visit `/sitemap.xml` — `daily-creatine-cognition` is NOT present; other slugs (non-supplement) ARE present.
result: pass

### 12. Sitemap + robots
expected: `/robots.txt` disallows `/(app)/`, `/api/`, `/(admin)/`, allows `/h/`, and points at the sitemap. `/sitemap.xml` returns valid XML with all non-supplement habit_template URLs.
result: pass

### 13. OpenGraph image render
expected: Visit `/h/cool-bedroom-deep-sleep/opengraph-image` directly. Returns a 1200×630 PNG containing the habit title, the YouTube thumbnail, and the speaker name on warm-paper background.
result: pass

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all tests pass after inline layout fixes on test 6]
