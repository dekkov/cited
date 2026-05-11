---
phase: 2
slug: curation-tooling-doac-corpus
status: draft
shadcn_initialized: true
preset: existing (apps/web/components.json — style=default, baseColor=neutral, lucide icons)
created: 2026-05-10
---

# Phase 2 — UI Design Contract: Curator Tooling

> Internal admin/curator tooling behind RLS role gate from Phase 1. Public clip pages and marketing landing are NOT in scope. Warm-paper palette from `UI-DESIGN.md` applies, but admin density expectations differ from product/marketing — favor information density and keyboard ergonomics over hero whitespace. All tokens derive from `UI-DESIGN.md`.

---

## Scope of This Contract

Phase 2 surfaces (all under `(admin)/curate/*`):

1. **Curation board** — kanban with 4 columns (Inbox / Drafting / Review / Published).
2. **Clip editor (three-pane workspace)** — left transcript / top-right player / bottom-right tabbed panel.
3. **AI co-pilot panel** — preset buttons + free-text, diff-style accept/reject.
4. **Transcript renderer** — word-virtualized.
5. **Transcript ingestion form** — URL paste + transcribing state.
6. **Removal modal** — soft-delete with reason enum.
7. **AION-10 warning badge** — surfaced on low-similarity AI suggestions.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized in `apps/web`) |
| Preset | `style=default`, `baseColor=neutral`, `cssVariables=true` |
| Component library | Radix (via shadcn primitives) |
| Icon library | **Hybrid:** `lucide-react` permitted for admin-only chrome (icon density, board affordances, toolbar). Hand-rolled SVGs from `UI-DESIGN.md` reserved for product/marketing surfaces — admin is NOT product. |
| Fonts | Geist Sans (UI body, buttons, dense tables) + Geist Mono (timestamps, video IDs, JSON previews) + Newsreader (italic claim quote preview in metadata panel only — admin is otherwise sans-serif for density) |

**Stack picks locked from CONTEXT Open Items:**
- `react-resizable-panels` — three-pane workspace (drag dividers between transcript / player / tabbed panel).
- `@dnd-kit/core` — kanban drag-to-advance between columns.
- `@tanstack/react-virtual` — transcript renderer (up to ~20K words per 3hr episode).
- `react-hook-form` + `zod` — metadata form (already a project convention).

---

## Spacing Scale

Declared values (multiples of 4, inherited from UI-DESIGN.md spacing language):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gap, inline-pill padding |
| sm | 8px | Compact element spacing, transcript word-gap, kanban-card stacked metadata |
| md | 16px | Default form-field spacing, board column inner padding, panel gutters |
| lg | 24px | Three-pane outer padding, board outer padding |
| xl | 32px | Admin shell horizontal gutter (matches UI-DESIGN container gutter ≥720px) |
| 2xl | 48px | Page-section break (not heavily used in admin) |

**Exceptions:**
- Transcript word-row line-height target ~28px (dense readability, not on 4-grid for vertical text rhythm). Acceptable single-axis exception — virtualization fixes this height.
- Kanban card min-height 96px (touch-comfort while staying dense).
- Resizable-panel drag-handle width 4px (`react-resizable-panels` default; visual only).

---

## Typography

Admin is **sans-first** for density. Newsreader (serif) appears only where the curator previews how the claim will read on the public habit card.

| Role | Family | Size | Weight | Line Height | Use |
|------|--------|------|--------|-------------|-----|
| Page H1 (admin shell) | Geist Sans | 24px | 600 | 1.2 | "Curation Board", "Editor — {clip_title}" |
| Section H2 (panel header) | Geist Sans | 16px | 600 | 1.3 | "Metadata", "AI Co-pilot", "Inbox" column header |
| Body (forms, table cells) | Geist Sans | 14px | 400 | 1.5 | Default UI body, form input text, transcript words |
| Small / caption | Geist Sans | 12px | 400 | 1.4 | Field hints, kanban card metadata row, badge text |
| Mono (timestamps, IDs, JSON) | Geist Mono | 12px | 400 (500 for emphasis) | 1.4 | `HH:MM:SS` ranges, `youtube_video_id`, transcript word timestamps tooltip |
| Eyebrow / mono label | Geist Mono | 10px | 400, tracking 0.14em | 1 | "CITED IN" preview, column count badges, "AI SUGGESTION" tag |
| Claim quote preview | Newsreader italic | 17px | 400 | 1.5 | Inside the metadata-form "preview" subpanel ONLY — matches how the claim will render on the public habit card per UI-DESIGN.md |

**Weight rule:** Two weights only across admin chrome — Geist Sans 400 (body) and 600 (headers/emphasis). Mono uses 400 with 500 for emphasis. Newsreader italic 400 only.

---

## Color

All values inherited from `UI-DESIGN.md` warm-paper-sage palette. Admin uses the same surface tokens but a denser distribution: more `--color-paper-2` for inset workspace panels.

| Role | Token | Hex / OKLCH | Usage |
|------|-------|-------------|-------|
| Dominant (60%) | `--color-paper` | `#F4EFE6` | Admin shell bg, three-pane outer bg, board outer bg |
| Secondary (30%) | `--color-paper-2` | `#EBE4D6` | Panel insets (transcript pane, player pane, tab panel), kanban column bg, kanban card surface |
| Tertiary surface | `--color-paper-3` | `#E0D7C5` | Empty-state column body, disabled state, transcript word hover bg |
| Primary text | `--color-ink` | `#15161A` | Body text, primary button bg |
| Secondary text | `--color-ink-2` | `#2C2D33` | Form labels, kanban card subtitle |
| Caption / mono text | `--color-ink-3` | `#5C5D66` | Timestamps, "Watch full episode", field hints |
| Disabled | `--color-ink-4` | `#8C8D96` | Disabled controls, AI-rejected suggestion strikethrough text |
| Border | `--color-rule` | `#D8CFBE` | Panel borders, kanban card border, table dividers |
| Border-soft | `--color-rule-soft` | `#E5DECD` | Inset sub-dividers, transcript line separators |
| Accent (10%) | `--color-accent` | `oklch(0.55 0.06 145)` (sage) | See reserved list below |
| Accent deep | `--color-accent-deep` | `oklch(0.42 0.07 145)` | Italic claim preview, board column-header "Published" |
| Accent soft | `--color-accent-soft` | `oklch(0.92 0.025 140)` | Transcript word-selection background, AI-suggested "added" diff line bg |
| Warn / risk | `--color-warn` | `oklch(0.62 0.10 55)` | Risk-flag chip background, AION-10 "⚠ may be unsupported" badge, removal-modal-destructive confirm button border |

**Accent (sage) reserved exclusively for:**
- Primary button background (`Approve & Publish`, `Save Draft`, `Accept suggestion`)
- Transcript word-selection highlight (`--color-accent-soft` bg)
- Active board-column count badge (top-of-Drafting badge when current focus)
- "Published" column header label
- AI-suggested diff "added" line (`--color-accent-soft` bg, `--color-accent-deep` left border)
- Status dot on kanban card when status = Review or Published
- "Next" / `g n` shortcut keyboard hint underline

**Warn (amber) reserved exclusively for:**
- AION-10 grounding badge "⚠ may be unsupported" (when cosine similarity <0.85)
- Risk-flag chips on the metadata form (medical/supplement/contraindication)
- Removal-modal destructive Confirm button (border + text in warn, ghost fill — not solid red)
- Hard-block error toast when curator tries to approve a prescription/dosing/diagnosed-condition clip (ADMN-06)

**Destructive (true red) — NOT used.** Per UI-DESIGN.md the palette has no red. Removal/destructive actions use `--color-warn` amber + explicit two-step confirmation copy. This is a deliberate constraint to keep the warm palette intact.

---

## Copywriting Contract

Voice: **direct, terse, second-person curator-internal**. No marketing voice. No exclamation points. Mono "system" tone for confirmations.

### Primary CTAs (verb + noun, never bare verbs)

| Surface | Copy |
|---------|------|
| Editor footer primary (Drafting → Review) | `Save & move to Review` |
| Editor footer primary (Review → Published) | `Approve & publish` |
| Editor footer secondary | `Save draft` |
| AI suggestion accept | `Apply suggestion` |
| AI suggestion reject | `Discard` |
| Co-pilot preset row | `Suggest start/end` · `Refine claim` · `Propose alternative phrasing` |
| Ingestion form submit | `Fetch transcript` |
| Removal modal confirm | `Remove clip` (in amber `--color-warn`) |
| Kanban "next" shortcut | `Jump to next ↩` (with `g n` keyboard hint) |

### Empty states

| Column / Surface | Heading | Body |
|------------------|---------|------|
| Inbox empty | `No URLs queued.` | `Paste a YouTube URL into the ingestion form to start a new clip.` |
| Drafting empty | `Nothing in drafting.` | `Move an Inbox item here, or pull the next item with` <kbd>g n</kbd>. |
| Review empty | `Nothing pending review.` | `Promote a Drafting item once required metadata is complete.` |
| Published empty | `No published clips yet.` | `Approved clips appear here. Target: 30 across 4 domains.` |
| Transcript not fetched | `Transcript pending.` | `Fetching auto-captions — falls back to Deepgram if unavailable.` |
| AI co-pilot idle | `Co-pilot ready.` | `Pick a preset above, or type a question about the selected span.` |
| Search-no-results (corpus-wide tsv) | `No transcript matches.` | `Try a shorter or different phrase.` |

### Loading / progress states

| Event | Copy |
|-------|------|
| Transcript fetching (YouTube auto-captions) | `Fetching captions…` (with subtle pulse on word "Fetching") |
| Deepgram fallback queued | `Transcribing — ~2 min` (mono, `--color-ink-3`) |
| Embedding on approve | `Embedding clip… (≤5s)` |
| AI co-pilot streaming | `Co-pilot thinking…` |

### Error states

| Event | Copy | Recovery path |
|-------|------|---------------|
| YouTube URL invalid | `Couldn't parse a YouTube video ID from that URL.` | `Expected formats: youtube.com/watch?v=… · youtu.be/… · youtube.com/shorts/…` |
| Captions unavailable, Deepgram also failed | `Transcript fetch failed.` | `Retry, or paste the transcript manually into the override panel.` |
| Approval hard-block (ADMN-06) | `Can't publish: this clip touches prescription / dosing / treatment of a diagnosed condition.` | `Edit the claim or remove the clip. See MEDICAL_REVIEW.md for the rule.` (in `--color-warn`) |
| Missing required field | `Missing: speaker, domain, risk_flags.` | inline at field, do not block save-draft |
| Embedding write failed | `Clip approved, embedding write failed.` | `Retry embed` button surfaces; clip stays in Review with sage-outline warning. |

### Destructive confirmations

**Removal modal (soft-delete, two-step):**
- Title: `Remove this clip?`
- Body: `Soft-deletes the clip and unlinks it from any habits using it as evidence. Habit records are preserved with evidence_clip_id set to NULL and flagged "needs new evidence". The clip stays in the database for audit.`
- Reason select (required): `dmca` / `factual-error` / `medical-risk` / `speaker-request` / `other`
- Notes (optional free-text)
- Takedown reference URL (optional, shown only when reason = `dmca`)
- Confirm button copy: `Remove clip` (amber border, ghost fill)
- Cancel: `Cancel`

### AION-10 grounding badge

- Label: `⚠ may be unsupported`
- Tooltip on hover: `This suggestion's wording does not closely match any transcript span (cosine <0.85). Verify against source before accepting.`
- Placement: top-right of every AI-suggested diff card when similarity check fails. Suggestion is still shown — curator owns accept/reject.

### Mono "system" lines (curator audit feedback)

These render in Geist Mono `--color-ink-3` at 11px, appearing as ephemeral toasts in the bottom-right of the admin shell:

- `[ai_suggested] start/end → 00:42:18 / 00:43:55`
- `[ai_accepted] claim refined`
- `[ai_rejected] alternative phrasing`
- `[removed] reason=factual-error`
- `[embedded] vector(1536) written in 1.2s`

Mirrors the `clip_edits` audit shape — curator sees their own audit log in real time.

---

## Surface-Specific Layout Contracts

### 1. Curation board (kanban)

- Outer padding: `lg` (24px). Background `--color-paper`.
- 4 columns side-by-side, each min-width 280px, max-width 360px, `--color-paper-2` bg, `--color-rule` 1px border, `--radius-lg` (16px), padding `md` (16px).
- Column header: H2 (Geist Sans 16/600) + mono count badge `12` in `--color-paper-3` pill. `Published` header label uses `--color-accent-deep` text.
- Column body: vertical stack of clip cards, `sm` (8px) gap. Each card:
  - Surface `--color-paper`, `--radius-md` (10px), 1px `--color-rule`, padding `md` (16px), min-height 96px.
  - Row 1: 13.5px Geist Sans 600 — clip claim (truncate 2 lines).
  - Row 2: 12px caption row — domain pill (sage dot + label) · `M:SS` duration · `2d ago`.
  - Row 3 (only if AI-touched): mono 10px tag `[ai_suggested]` in `--color-ink-3`.
  - Drag handle: full card; cursor `grab` on hover, `grabbing` while dragging (via `@dnd-kit/core`).
- Manual priority pin: small pin icon top-right (lucide `Pin`); pinned cards float to top within their column with sage outline.
- "Next" affordance: top-right of admin shell — button `Jump to next ↩` with mono `g n` keyboard hint to the right.

### 2. Clip editor (three-pane workspace)

`react-resizable-panels` with horizontal split first (left transcript vs right column), then right column has a vertical split (player on top, tabbed panel on bottom).

- **Left pane (transcript):** Min-width 40% / default 50%. `--color-paper-2` bg, padding `md`. Sticky top toolbar: search input (corpus-wide tsv search, mono placeholder `find a phrase…`), domain filter, "captions | deepgram" source pill.
  - Word-level virtualized list via `@tanstack/react-virtual`.
  - Each word: 14px Geist Sans, `--color-ink`, hover bg `--color-paper-3`, click = set anchor, shift+click = set end. Selected range bg `--color-accent-soft`.
  - Timestamp marker every paragraph break: `00:42:18` in 11px Geist Mono `--color-ink-3`.
  - Floating "selection chip" appears at top of pane when a selection is active: `00:42:18 → 00:43:55 · 1:37` with `[` / `]` keyboard hints and `± nudge` buttons.
- **Top-right pane (player):** ~360px height, default 40% of right column. `<YouTubeEmbed>` from `@next/third-parties/google` (per UI-DESIGN.md product rule — real iframe in product surfaces). `--radius-md`. Player auto-seeks when transcript selection changes.
- **Bottom-right pane (tabbed):** ~60% of right column. Two tabs:
  - **Metadata** — `react-hook-form` form. Fields: claim (textarea 3 rows, Newsreader-italic preview to the right inside a `--color-paper-2` `--radius-md` block), rationale, speaker (autocomplete from `podcasts` host/guest list, inline-add per ADMN-16), speaker_status (radio: `verified` / `unverified` / `host`), domain (4-radio), evidence_strength (1–5), risk_flags (multi-select chips in `--color-warn` background when selected). Inline hint for ADMN-15 below the claim field: `Length: as detailed as needed to convey the claim, not more.` (mono, `--color-ink-3`).
  - **AI Co-pilot** — see next surface.
- Footer of editor: sticky bottom bar, `--color-paper` bg, `--color-rule` top border. Left: `Save draft`. Right: status-aware primary (`Save & move to Review` or `Approve & publish`).

### 3. AI co-pilot panel

- Top: three preset buttons (`Suggest start/end`, `Refine claim`, `Propose alternative phrasing`) — Geist Sans 13/500, `--color-paper-2` bg, `--color-rule` border, `--radius-sm`. Active/loading state replaces icon with spinner.
- Below presets: single-line free-text input (`Ask the co-pilot…`) with submit on Enter.
- Suggestion list (newest first): each suggestion is a card.
  - Card surface `--color-paper`, `--radius-md`, 1px `--color-rule`. Padding `md`.
  - Header row: 10px Geist Mono `AI SUGGESTION` eyebrow · 11px Geist Mono timestamp · AION-10 badge (`⚠ may be unsupported`) if similarity <0.85.
  - Body: side-by-side diff —
    - Removed lines: strikethrough text in `--color-ink-4`, left border `--color-rule` 2px.
    - Added lines: `--color-accent-soft` bg, left border `--color-accent-deep` 2px, 14px Geist Sans.
  - Action row: ghost `Discard` (left) · primary `Apply suggestion` (right, sage bg).
- Every accept/reject writes a `clip_edits` row and emits a mono audit-toast.

### 4. Transcript ingestion form

- Single card on `(admin)/curate/ingest`. `--color-paper-2` bg, `--radius-lg`, padding `lg`.
- Field: URL input (Geist Mono placeholder `https://www.youtube.com/watch?v=…`).
- Submit: `Fetch transcript` (sage primary).
- After submit, replace form body with a status block:
  - Step 1: `Resolving video metadata…` → `✓ {episode title}` (sage check).
  - Step 2: `Fetching auto-captions…` → either `✓ Captions found ({N} words)` OR `⚠ No captions — queuing Deepgram`.
  - Step 3 (only when fallback): `Transcribing — ~2 min` with a determinate progress bar (`--color-accent` fill, `--color-rule` track).
  - Step 4: `✓ Indexed into corpus (tsvector + chunks).`
- All step copy in 13/400 Geist Sans, status icons sage, fallback amber.

### 5. Removal modal

- Radix Dialog via shadcn. Backdrop `--color-ink/40`. Dialog surface `--color-paper`, `--radius-lg`, max-width 520px, padding `lg`.
- Title H2 (16/600). Body 14/400. Reason select required. Submit disabled until reason chosen.
- See copy under "Destructive confirmations" above.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `button`, `input`, `label`, `card` (already in repo) · new in Phase 2: `dialog`, `tabs`, `select`, `textarea`, `checkbox`, `tooltip`, `badge`, `dropdown-menu`, `form`, `toast` | not required |
| third-party (npm, not registries) | `react-resizable-panels`, `@dnd-kit/core`, `@tanstack/react-virtual`, `@next/third-parties/google` (YouTubeEmbed) — all well-known maintained libs from approved stack list | view-gate not applicable (these are npm packages, not shadcn registry blocks) |

No third-party shadcn registries declared. Registry safety gate not triggered.

---

## Accessibility

- Three-pane workspace: resizable handles need `aria-label="Resize transcript pane"` etc.
- Transcript virtualization must preserve `role="list"` / `role="listitem"` semantics on word rows; word range selection announced via `aria-live="polite"` region with "{N} words selected from {start} to {end}".
- Kanban: `@dnd-kit/core` accessibility wrappers required; keyboard drag via `space → arrow → space`.
- AI suggestion diff: each diff card `role="article"` with `aria-labelledby` referencing the eyebrow.
- Removal modal: focus trap, Escape closes, default focus on reason select.
- Keyboard shortcuts (`[`, `]`, `space`, `←/→`, `g n`) documented in a `?` keyboard-cheatsheet overlay — Radix Dialog, mono-styled.

---

## Out-of-Scope Visual Surfaces

Explicitly NOT in this contract (deferred):
- Public clip page `/h/[slug]` rendering — Phase 3/4.
- Marketing landing page sections — Phase 4.
- Habit card three modes (hero / inline / collapsed) — Phase 3.
- Public DMCA submission form — re-pickup when public surfaces ship.
- Dark mode / cool-oxblood palette variants — deferred indefinitely.
- Multi-curator queue / assignee UI — out of scope (single curator at MVP).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

*Generated 2026-05-10 by gsd-ui-researcher. Pre-populated from CONTEXT.md (7/7 gray areas locked) and UI-DESIGN.md (all tokens). No user input required — upstream artifacts fully answered the design contract.*
