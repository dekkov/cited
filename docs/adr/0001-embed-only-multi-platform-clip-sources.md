# ADR 0001 — Embed-only multi-platform clip sources; never re-host

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Hoang (project owner)

## Context

The MVP currently embeds DOAC long-form YouTube clips via `<YouTubeEmbed>` (lite-embed) with `start_sec` / `end_sec` deep-linking. During Phase 4 scoping, two questions were raised:

1. Should the system also accept short-form content (YouTube Shorts, TikTok, Instagram Reels)?
2. Should the system re-host downloaded-and-cut video files when (a) a platform's embed seems to navigate the user away, or (b) the desired evidence is only part of a longer short-form video that can't be timestamp-deep-linked?

The "deep-link only, never re-host" constraint was already locked in `CLAUDE.md` and `PROJECT.md` and underpins the project's documented three-layer legal posture (`docs/legal/right-of-publicity.md`), but the questions surfaced a real UX pull toward re-hosting that needed an explicit, reasoned answer.

## Decision

1. **Allow four source platforms** at the embed layer: `youtube_long`, `youtube_short`, `tiktok`, `instagram_reel`. A new `source_platform` enum field is added to `clips`.
2. **Always embed via the platform's official player.** Never download, re-encode, host, or otherwise serve audio/video bytes from any Cited-controlled origin or CDN.
3. **Partial-clipping is allowed only on sources whose embed API natively supports `start`/`end` parameters** — currently `youtube_long` and `youtube_short`. For `tiktok` and `instagram_reel`, the clip is the entire posted video; curators either embed the whole short or skip the source.
4. Editorial policy in `MEDICAL_REVIEW.md` adds: *"For partial clips, the source platform must natively support timestamp deep-linking. If a long TikTok or Reel contains only a relevant segment, skip the source rather than re-cut."*

## Alternatives Considered

### Alternative A — Re-host downloaded, cut video files on Cited-controlled storage

Rejected because:

- **Fair-use factor 4 collapses.** Cited's posture leans on *no market harm — drives traffic back to source*. Serving the video from a Cited CDN makes Cited the substitute, not the referrer.
- **No DMCA safe harbor.** Cited becomes the publisher, not a passive deep-linker. Statutory damages exposure under 17 U.S.C. § 504(c)(2) is up to **$150,000 per work** for willful infringement.
- **Violates YouTube ToS, TikTok ToS, and Meta Platform Terms.** All three prohibit redistribution of content their official APIs don't expose for that purpose.
- **Reverses three locked decisions** in `PROJECT.md` (deep-link only; three-layer legal posture; DOAC-friendly non-objection pitch ladder).
- **Inherits liability to self-hosters.** Every forked deployment becomes a separate DMCA target. Worsens Pitfall 7 (solo-maintainer triage spiral).
- **Kills the DOAC pitch.** The pitch is "we drive listeners to your show." Re-hosting is the opposite of that pitch.

### Alternative B — YouTube only (status quo, no short-form surfaces)

Considered. Adequate for MVP. Rejected for Phase 4+ scope because:

- Short-form is where credentialed creators increasingly publish first.
- DOAC has its own TikTok, IG, and YT Shorts surfaces — the same publisher, accessible via embed.
- Engineering cost to add three embed components is small (~1–2 days); curation throughput benefit and surface variety are real.

### Alternative C — Link-out instead of embed for TikTok/IG

Rejected. All four target platforms support in-page playback via official embed APIs. Linking out is a worse UX with no legal benefit (an embed is no more legally exposed than a link, and both rely on the platform's own player chrome and ToS-compliant referrer behavior).

## Consequences

**Positive**

- Surface variety expands without legal-posture regression.
- DOAC pitch ladder remains intact ("we drive listeners to your show across every surface you publish to").
- Self-hosters inherit the same low-liability posture as the hosted demo.
- Curator decision is bounded by a clear editorial rule, not subjective per-clip judgment.

**Negative**

- Engineering cost: add TikTok embed component, Instagram embed component (Meta App Review required for `oembed_read`), YT Shorts handling. Estimated 1–2 days.
- Curation rule: long TikToks/Reels with only a relevant segment must be skipped, which costs some otherwise-useful evidence.
- Instagram Reels gated on Meta App Review — may take days to weeks. Treat IG as the last surface to wire; YT long, YT Shorts, and TikTok are unblocked.

**Neutral**

- Schema migration is additive (`source_platform` enum, default `youtube_long` for existing rows). Backward-compatible.

## Compliance Hooks

- `MEDICAL_REVIEW.md` editorial guidance updated with partial-clip rule.
- `docs/legal/right-of-publicity.md` unchanged — posture still holds because re-hosting is rejected.
- `docs/legal/self-host-referer-policy.md` may need a brief addendum noting TikTok and Instagram referrer requirements; verify when those embeds land.

## Revisit Triggers

- Meta deprecates Instagram oEmbed without replacement → drop `instagram_reel` from the enum.
- A platform's ToS changes to forbid embedding → drop that platform from the enum.
- Fair-use case law shifts materially against transformative-use commentary platforms → revisit the whole posture, not just this ADR.
