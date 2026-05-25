# Cited — Domain Glossary

> Single source of truth for project-specific terminology. This is **not** a spec, not implementation notes — only the language we use to talk about the domain. Update inline as terms resolve.

## Clip-source vocabulary

### Source platform
Where a clip's media lives. One of: `youtube_long`, `youtube_short`, `tiktok`, `instagram_reel`. Stored as a `clips.source_platform` enum. The clip's media is **always served by the platform's own player** — Cited never hosts the bytes. See [ADR 0001](./docs/adr/0001-embed-only-multi-platform-clip-sources.md).

### Partial-clip-eligible source
A source platform whose embed API natively accepts `start` / `end` (or equivalent) parameters, allowing playback of a sub-range of the source media. Currently: `youtube_long`, `youtube_short`. Clips from these sources MAY use `start_sec` / `end_sec`.

### Whole-clip-only source
A source platform whose embed API plays the entire posted media; sub-ranges are not addressable. Currently: `tiktok`, `instagram_reel`. Clips from these sources are equal to the whole posted media; `start_sec` / `end_sec` are NULL. If only a segment of a long post is relevant, the curator **skips the source** rather than re-cutting it.

### Deep-link
A URL or embed parameter that addresses a sub-range of a source media item (e.g., `youtu.be/<id>?start=120&end=150`). Distinct from a "link" (whole-media URL). Cited's fair-use posture depends on deep-linking, not re-hosting.

### Re-hosting (forbidden)
Downloading, re-encoding, or otherwise serving the media bytes of any third-party clip from Cited-controlled storage or CDN. Forbidden by `CLAUDE.md`, `PROJECT.md`, and [ADR 0001](./docs/adr/0001-embed-only-multi-platform-clip-sources.md) regardless of platform, license, or commercial status.

## Speaker / source-of-claim vocabulary

### Credentialed guest
A named expert featured in a podcast episode or short-form post who holds verifiable credentials (degree, license, publication record, institutional affiliation) for the domain in which they make a claim. Distinct from the **host** (e.g., Steven Bartlett) who is not credentialed in any health domain.

### Speaker status
Per-clip enum: `verified` (credentialed-guest claim with verified credentials), `unverified` (named guest but credentials not yet verified), `host` (claim made by the podcast host themselves — used carefully and rarely; never as the sole evidence). Stored as `clips.speaker_status`.

## Curation lifecycle

### Pending / Approved
The two primary states of a clip. `pending` clips exist in the corpus but are not eligible for user-facing recommendation or display. `approved` clips have passed editorial and risk review and may surface in habit cards and `/h/[slug]` pages.

### Risk flags
Mandatory tags applied at approval covering prescription drugs, dosing, diagnosed-condition treatment, and other guard-rail categories enumerated in `MEDICAL_REVIEW.md`. Approval is hard-blocked if any disqualifying flag is set.

---

*This file is a glossary, nothing else. Implementation details, architecture decisions, and process documentation belong in `docs/adr/`, `.planning/`, or code — not here.*
