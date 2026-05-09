# Cited

> Habits backed by people who study this for a living.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/trhoang220703/cited/actions/workflows/ci.yml/badge.svg)](https://github.com/trhoang220703/cited/actions/workflows/ci.yml)
[![Open Collective](https://img.shields.io/opencollective/all/cited?label=Open%20Collective)](https://opencollective.com/cited)

## What this is

An open-source, evidence-backed health habit tracker. Each recommended habit is grounded in a short, deep-linked clip from a credentialed health podcast — at MVP, exclusively *The Diary of a CEO* (DOAC) — so users can see the *why* behind every habit in 90 seconds. AI conducts a personalized onboarding interview, recommends habits with podcast-clip citations, and offers an "equivalent-benefit swap" when a habit doesn't fit a user's life.

Target user: health-podcast listeners who consume hours of expert content but rarely operationalize anything.

**Core value:** Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker. If the evidence layer fails or feels generic, the project has no differentiator.

## Status

Pre-alpha. Schema + auth + repo posture are landing in Phase 1; ≥30 curated clips arrive in Phase 2; demo-able user loop in Phase 3. See [.planning/ROADMAP.md](.planning/ROADMAP.md).

## Getting started

```bash
pnpm install
pnpm dev
```

Full instructions (self-host, docker compose, environment variables) live in `docs/quickstart.md` — deferred to the Phase 4 docs site. For now see the `apps/web` README for local dev details.

## Maintainer bandwidth

> **Solo maintainer.** I have ~2 hours/week for issue triage and PR review. Please be patient — see [CONTRIBUTING.md](./CONTRIBUTING.md) for how to make your contribution reviewable in that budget. If you need a faster turnaround, sponsoring via Open Collective unlocks dedicated time.

## Editorial policy

All clips are reviewed for accuracy and credential quality before approval. Medical and health claims touching supplements, fasting, hormones, sleep pharmacology, or mental-health interventions require a reviewer with MD, RD, or PhD-level credentials. Cited is **not** medical advice.

See [MEDICAL_REVIEW.md](./MEDICAL_REVIEW.md) for the full editorial and attribution policy.

## Legal posture

- Privacy policy: [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md)
- Right of publicity: [docs/legal/right-of-publicity.md](./docs/legal/right-of-publicity.md)
- DMCA / takedown: see Phase 2 for `/docs/legal/dmca.md` (landing with Phase 2 clip pipeline)
- Sub-processors: [docs/legal/sub-processors.md](./docs/legal/sub-processors.md)

## Contributing

Contributions are welcome — please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md) Code of Conduct.

## Sponsorship

Cited has no paid tiers and no VC funding. Hosting and LLM costs are covered by community sponsorship.

<!-- TODO: replace after account setup checkpoint -->
- [Open Collective](https://opencollective.com/cited) — recurring or one-time support
- [GitHub Sponsors](https://github.com/sponsors/<placeholder-username>) — GitHub-native sponsorship

See [docs/oss/sponsorship.md](./docs/oss/sponsorship.md) for burn-rate transparency and tier details.

## License

[MIT](./LICENSE) — Copyright (c) 2026 Cited contributors.
