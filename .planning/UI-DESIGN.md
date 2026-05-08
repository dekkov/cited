# UI Design System: Cited

**Status:** Active reference — all frontend plans must read this file before specifying components or styles.
**Source:** `Cited-design-reference/design_handoff_cited_landing/` (high-fidelity HTML prototype)
**User choices locked:** warm palette · animated waveform on marketing, real `<YouTubeEmbed>` in product · warm only at MVP

---

## Design Philosophy

- **Editorial over app.** Newsreader (serif) carries headings and body rationale. Geist Sans handles UI chrome. Geist Mono anchors metadata, timestamps, and labels.
- **Evidence in view.** The habit card is the product surface — speaker credentials, claim quotes, evidence tags, and risk flags are always visible, never in tooltips.
- **Consistency-first check-in.** The rolling streak number ("18/21 last 3 weeks") dominates; streak-as-XP and social pressure are deliberately absent.
- **Warm paper, sage accent.** Off-white paper with sage green as the single accent. Ink replaces black for softer contrast. All other palette variants (cool oxblood, dark ivory) are deferred.

---

## Color Tokens (Warm Paper · Sage — the only active palette at MVP)

Implement as Tailwind v4 `@theme` tokens in `apps/web/app/globals.css`.

```css
@theme {
  /* Surfaces */
  --color-paper:     #F4EFE6;  /* page bg, card bg */
  --color-paper-2:   #EBE4D6;  /* inset surfaces, clip block bg, collapsed bar */
  --color-paper-3:   #E0D7C5;  /* empty streak cells, avatar gradient */

  /* Text */
  --color-ink:       #15161A;  /* primary text, primary button bg */
  --color-ink-2:     #2C2D33;  /* secondary body text */
  --color-ink-3:     #5C5D66;  /* captions, mono labels, nav links */
  --color-ink-4:     #8C8D96;  /* disabled, terminal comment lines */

  /* Dividers */
  --color-rule:      #D8CFBE;  /* strong dividers, card borders */
  --color-rule-soft: #E5DECD;  /* soft dividers, inset borders */

  /* Accent — sage */
  --color-accent:      oklch(0.55 0.06 145);  /* domain dot, streak fill, evidence dot, quote-mark */
  --color-accent-soft: oklch(0.92 0.025 140); /* selection bg */
  --color-accent-deep: oklch(0.42 0.07 145);  /* italic headings, "Operationalize", "No re-hosting." */

  /* Semantic */
  --color-warn: oklch(0.62 0.10 55);  /* risk flag dot, caution state */
}
```

**Deferred palette variants** (design tokens documented for future use — do NOT implement at MVP):
- Cool Paper · Oxblood: `--paper #EFEEEA`, `--ink #16181C`, `--accent oklch(0.45 0.10 22)`
- Off-black · Ivory: `--paper #14151A`, `--paper-2 #1C1E25`, `--ink #F2EFE6`, `--accent oklch(0.78 0.07 140)`

---

## Typography

Load via `next/font/google` in the root layout. All three families required.

| Family | Weights to load | Variable font? |
|--------|-----------------|----------------|
| **Newsreader** | 400, 400 italic | Yes — `opsz` axis (8..36) |
| **Geist Sans** | 300, 400, 500, 600, 700 | Yes |
| **Geist Mono** | 400, 500 | Yes |

### Scale

| Role | Family | Weight | Size | Letter-spacing | Line-height |
|------|--------|--------|------|----------------|-------------|
| Hero H1 | Newsreader | 400 | `clamp(40px, 6.4vw, 76px)` | `-0.025em` | 0.98 |
| Section H2 | Newsreader | 400 | `clamp(32px, 4.2vw, 48px)` | `-0.018em` | 1.08 |
| Card title (hero mode) | Newsreader | 400 | 28px | `-0.018em` | 1.15 |
| Card title (inline / collapsed) | Newsreader | 400 | 24px | `-0.018em` | 1.15 |
| Card title (mobile <720px) | Newsreader | 400 | 22px | `-0.018em` | 1.15 |
| Step / mini-habit title | Newsreader | 400 | 26px / 22px | — | 1.1–1.2 |
| Body lede | Newsreader | 400 | `clamp(17px, 1.6vw, 20px)` | — | 1.5 |
| Card rationale ("Why") | Newsreader | 400 | 16px | — | 1.5 |
| Claim quote | Newsreader | 400 italic | 17px | — | 1.5 |
| Streak number | Newsreader | 400 | 30px | `-0.02em` | 1 |
| Italic heading accent | Newsreader | 400 italic | inherit | — | — |
| UI body | Geist Sans | 400 | 14–16px | — | 1.55 |
| Button | Geist Sans | 500 | 13–14px | — | — |
| Speaker name | Geist Sans | 600 | 13.5px | — | — |
| Nav links | Geist Sans | 400 | 13px | — | — |
| Mono labels / eyebrows | Geist Mono | 400 | 10–12px | 0.06–0.16em | — |
| Timestamps / mono meta | Geist Mono | 400 | 11px | 0.08–0.10em | — |

**Italic accents in headings** (e.g., "study *this*", "*Operationalize* more", "*No re-hosting.*"): wrap in `<em>`, apply `--color-accent-deep`.

---

## Spacing

- **Container:** max-width 1240px; horizontal gutter 32px (20px below 720px).
- **Section vertical rhythm:** 96px top + bottom (hero: 72px top / 56px bottom).
- **Card inner:** 26px padding (20px below 720px), 18px flex gap between card sections, 14px gap between sub-blocks.

---

## Radii

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 6px | small chips |
| `--radius-md` | 10px | inset blocks, player surface, terminal lines |
| `--radius-lg` | 16px | section cards, mini-habit cards, swap interstitial, clip block |
| `--radius-xl` | 24px | the habit card itself |
| 999px | — | pills, CTA buttons, check-in capsule, freeze pill |

---

## Shadows

```css
@theme {
  --shadow-card: 0 1px 0 rgba(21,22,26,0.04), 0 8px 28px -16px rgba(21,22,26,0.18);
  --shadow-soft: 0 1px 0 rgba(21,22,26,0.04), 0 2px 12px -8px rgba(21,22,26,0.1);
}
```

---

## Icons

All icons are hand-rolled inline SVG. Properties:
- Stroke width: 1.5–1.6, round joins and round caps
- Viewbox: 14×14 or 16×16

Required icon set: Check, Skip, Half (partial circle), Play, Pause, Swap (⇄), External arrow, Caret down, Quote mark (opening sage " "), Snowflake (streak freeze: vertical line + 2 diagonals).

No icon library (Lucide, Heroicons) — use the SVGs defined in `habit-card.jsx` as the source of truth.

---

## Habit Card (`<HabitCard>`) — Three Modes

The focal component. Source of truth: `Cited-design-reference/design_handoff_cited_landing/habit-card.jsx`.

### Container
- 26px padding (20px <720px), `--radius-xl` (24px), 1px `--color-rule` border, `--color-paper` bg, `--shadow-card`.
- `data-status="done"` → border becomes `--color-accent`, doubled shadow ring.
- `data-status="partial"` → border softens toward `--color-accent` at reduced opacity.

### Three clip prominence modes

| Mode | Clip block height | Used in |
|------|-------------------|---------|
| `hero` | 200px player | Marketing hero (right column), full-page habit view |
| `inline` | 140px player | Habit feed, search results |
| `collapsed` | Single row (30×30 play circle + timestamp label) | Compact list views |

### Collapsed → expanded interaction
Tapping the collapsed bar slides open the full clip block as a drawer (`@keyframes drawer`: opacity 0→1, translateY -8→0, 0.4s ease) with autoplay.

### Clip player — marketing vs. product

| Surface | Player type | Why |
|---------|-------------|-----|
| Marketing landing page (`(marketing)/page.tsx`) | Custom animated waveform — 56 vertical bars, 45° striped bg, no YouTube iframe | No YouTube API load cost on a cold public page |
| Product habit card (`(app)/*`) | Real `<YouTubeEmbed>` from `@next/third-parties/google` | Actual episode playback; loads only on interaction |

**Do not** put a real YouTube iframe on the marketing landing page. **Do not** put the custom waveform animation in the authenticated product.

### Clip block anatomy
1. **Eyebrow:** "CITED IN" — 10px Geist Mono, 0.16em tracking.
2. **Player surface:** striped background + animated waveform bars (marketing) or `<YouTubeEmbed>` (product). Play button top-right, 40×40 circle.
3. **Meta row:** `M:SS / M:SS` time · timestamp range `HH:MM:SS → HH:MM:SS` (mono `--ink-3`) · "Watch full episode ↗".
4. **Progress bar:** 2px `--color-rule` track, `--color-accent` fill.
5. **Claim quote:** 17px Newsreader italic, opening sage quote-mark glyph, top divider.
6. **Credential row:** 36×36 circular avatar gradient + speaker name (13.5px 600) + title (12px `--ink-2`) + affiliation (10px mono `--ink-3`). Right side: `Evidence: Strong` pill (sage dot) and `Risk: None` pill (sage dot, or `--color-warn` amber if non-None).

### Swap interstitial
- Triggered by "Swap ⇄" pill in card header.
- Background `--color-paper-2`, 1px `--color-accent` border, `--radius-lg`.
- Heading: "EQUIVALENT-BENEFIT SWAP" mono 0.14em, `--color-accent-deep` + close ×.
- Body: "Same domain, similar evidence: *[alt habit title]*" (italic, serif).
- Actions: primary "Use this instead" + ghost "Keep current".

### Check-in + streak footer
Two-column grid ≥540px (`auto 1fr`, 24px gap), stacks below.

**Left — tri-state check-in:**
- Pill capsule (`--color-paper-2` bg, 999px radius), three buttons: `Done` / `Partial` / `Skip`.
- Active states: Done → `--color-accent` fill; Partial → mid-sage; Skip → `--color-ink-3` fill.
- 7×12px padding, 12.5px Geist 500, gap-6 icon + label.

**Right — streak strip:**
- Number: 30px Newsreader "18" + "/21" at 16px `--ink-3`. Caption "LAST 3 WEEKS" mono.
- Freeze pill: "2 freezes available" — 10px mono, `--color-paper-2` bg, snowflake SVG.
- 21-cell grid (`repeat(21, 1fr)`, 3px gap). States: `on` → `--color-accent`; `half` → mid-sage; `pending` (today) → dashed `--color-accent` outline; empty → `--color-paper-3`.

---

## Marketing Landing Page Sections

Planned for Phase 4 (alpha launch). Sections top-to-bottom:

1. **Top Nav** — sticky, 64px, blur+translucent bg. Brand mark (10×10 sage square + "Cited" wordmark). Nav links + Sign in ghost button. Links hidden <720px.
2. **Hero** — two-column (copy left, habit card stage right) ≥1000px. H1 with "study *this*" italic accent. Pill status tag. CTA pair. Meta strip (30+ clips / 4 domains / 0 ads).
3. **How It Works** — 3-step card grid (1px dividers), each step with numbered eyebrow, Newsreader title, body, and an inline illustration.
4. **Anatomy of a Citation** — 6-row numbered list left, sticky blueprint diagram right. Each row: claim / clip / credentials / risk flag / check-in / swap.
5. **Sample Habits ("In the library")** — 3→2→1 column mini-habit card grid. Each card: domain pill, habit title, speaker avatar row (dashed divider).
6. **Open by Default (OSS)** — copy left (GitHub star + CONTRIBUTING.md CTAs + medical disclaimer strip), terminal block right (fake `pnpm dev` boot, blinking cursor).
7. **Footer** — 4-column grid (brand / Product / Open source / Legal). Bottom bar: "© 2026 · MIT licensed" + version.

---

## Responsive Breakpoints

| Breakpoint | Change |
|------------|--------|
| <540px | Card footer stacks (check-in above streak) |
| <720px | Container padding 32→20px; nav links hidden; footer 4→1 col; card title 24→22px |
| <880px | How It Works 3-col → 1-col |
| <1000px | Hero and Anatomy 2-col → stacked |
| <1080px | Mini-habit 3→2 cols |

---

## Animations & Transitions

| Element | Transition |
|---------|------------|
| Card status border | `border-color 0.3s ease, box-shadow 0.3s ease` |
| Drawer (collapsed → expanded) | `@keyframes drawer` — opacity 0→1, translateY -8→0, 0.4s ease |
| Mini-habit hover | translateY -2px, border darkens, 0.2s |
| Primary button hover | lifts 1px with shadow |
| Ghost button hover | bg → `--color-paper-2` |
| Terminal cursor | `@keyframes blink` — 50% opacity 0, 1s steps(2) infinite |

---

## Accessibility

- Check-in tri-state: `role="radiogroup"` with `role="radio"` children.
- Clip player: `aria-label="Play clip"` / `aria-label="Pause clip"` on the play/pause button; `aria-label="Clip progress"` on the progress bar.
- Swap interstitial close: `aria-label="Close swap suggestion"`.
- Domain dots and evidence dots: `aria-hidden="true"` (decorative).
- Streak cells: `aria-label="{date}: {status}"` for the 21-cell grid.

---

## Implementation Notes

- Translate CSS custom properties → Tailwind v4 `@theme` in `apps/web/app/globals.css`.
- Card CSS → a CSS Module (`habit-card.module.css`) for the complex waveform animation; everything else Tailwind utility classes.
- Fonts loaded via `next/font/google` in `apps/web/app/layout.tsx` (root layout), not via `<link>` in `<head>`.
- The tweaks panel from the prototype is **not** needed in production — palette switching and card layout mode are real product settings (stored in user preferences via `profiles` table or `localStorage` for non-authed marketing page).
- Ship warm palette only at MVP. Dark mode deferred to Phase 4.
- All state in the habit card (status, playing, swap open) is local `useState`; persistence goes to `habit_check_ins` table via server action.

---

*Last updated: 2026-05-07 — locked from design_handoff_cited_landing prototype.*
