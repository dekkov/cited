# Multi-surface clip embeds (YT Shorts + TikTok + Instagram Reels)

**Captured:** 2026-05-24
**Status:** Backlog — post-alpha (deferred beyond Phase 4)
**Anchor decision:** [ADR 0001 — Embed-only multi-platform clip sources; never re-host](../../docs/adr/0001-embed-only-multi-platform-clip-sources.md)

## What

Extend the clip-embed surface from `youtube_long` (current) to four source platforms: `youtube_long`, `youtube_short`, `tiktok`, `instagram_reel`. All four play in-page via the platform's own official embed API. **No re-hosting under any circumstances.**

## Why

- Credentialed creators (including DOAC) increasingly publish to short-form surfaces. The corpus is artificially narrow if it ignores them.
- In-page playback on all four platforms is solved by official embed APIs — there is no UX reason to avoid them.
- Schema is already podcast-agnostic; this work makes the data layer match.
- Resolves a recurring question ("can we re-host cuts?") with an explicit, locked answer recorded in ADR 0001.

## Acceptance sketch

### Schema (additive, backward-compatible)

- Add `clips.source_platform` enum: `youtube_long | youtube_short | tiktok | instagram_reel`. Default existing rows to `youtube_long`.
- `clips.start_sec` and `clips.end_sec` become nullable (already are for whole-clip-only sources).
- Drizzle migration + zod schema update in `packages/api-contracts`.

### Embed components

- `<YouTubeEmbed>` (current) already covers `youtube_long` and `youtube_short` — verify Shorts URLs render correctly with `start`/`end` (rarely needed since Shorts are ≤60s, but the API supports it).
- New `<TikTokEmbed>` component wrapping the official oEmbed iframe. No `start`/`end` support — whole video plays.
- New `<InstagramReelEmbed>` component — gated on Meta App Review granting `oembed_read` permission. Whole video plays.
- `<HabitCard>` and `/h/[slug]` switch on `source_platform` to pick the right component.

### Editorial policy

- Update `MEDICAL_REVIEW.md` with the partial-clip rule: *"For partial clips, the source platform must natively support timestamp deep-linking. If a long TikTok or Reel contains only a relevant segment, skip the source rather than re-cut."*
- Update curator-facing prompt in the admin clip editor to enforce this at approval time.

### Self-host docs

- Addendum to `docs/legal/self-host-referer-policy.md` for TikTok and Instagram referrer requirements (verify when those embeds land; both platforms require a referer header to play, similar to YouTube).

## Dependencies

- ADR 0001 (locked, 2026-05-24).
- `clips` table exists (Phase 1 schema).
- Admin clip editor exists (Phase 2).
- `<HabitCard>` and `/h/[slug]` exist (Phase 3).

## Sequencing / readiness

| Sub-item | Blocked on |
|---|---|
| Schema migration + `source_platform` enum | Nothing — unblocked |
| `youtube_short` rendering | Nothing — same embed component as long-form |
| `<TikTokEmbed>` component + curator UI changes | Nothing — TikTok oEmbed is open |
| `<InstagramReelEmbed>` | **Meta App Review for `oembed_read`** — apply early; review can take days to weeks. Wire this surface last. |
| `MEDICAL_REVIEW.md` partial-clip rule | Land at the same time as the schema (defines the curator's contract) |
| Self-host referrer addendum | Land when TikTok / IG embeds ship |

## Out of scope (until needed)

- AI-assisted cross-platform claim deduplication (same clip posted to YT Short and TikTok — detect and group).
- Per-platform analytics breakdown in alpha metrics dashboard.
- Bulk import of a creator's full short-form library (would be effectively a crawler; not in scope).
- Sources outside the four-platform allowlist (Snipd, Spotify clips, X video, etc.).

## Sequencing rationale (why not Phase 4)

Phase 4 is the alpha-launch phase — its goal is to ship the existing DOAC-YouTube-long-form demo at a real domain with re-engagement, GDPR cascade, Fumadocs site, and alpha metrics. Adding three new embed surfaces (and a Meta App Review wait) into Phase 4 would:

- Compete with the rename + hosted-demo gate that hard-blocks public launch.
- Pull editorial guidance work into a phase that should be tightening, not expanding, the corpus.
- Risk Meta App Review delays slipping the alpha launch date.

Better placement: **post-alpha — Phase 5 corpus expansion or a dedicated later phase**, once the existing single-surface demo has alpha metrics behind it. The work is purely additive and the schema migration is backward-compatible, so the cost of waiting is near zero.

## Revisit triggers

See ADR 0001 §"Revisit Triggers" — platform-ToS changes or Meta deprecating oEmbed re-open this decision.
