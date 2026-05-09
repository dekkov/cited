# Contributing to Cited

Thank you for your interest in contributing to Cited! This project aims to make evidence-backed health habits accessible to everyone, grounded in real podcast science. Every contribution — code, clip submissions, docs, or bug reports — helps.

## Maintainer bandwidth note

This is a solo-maintained open-source project. The maintainer has approximately **2 hours/week** for issue triage and PR review. Please be patient, and read this guide before opening a PR. A well-prepared contribution gets reviewed faster. If you need a faster turnaround, consider sponsoring via [Open Collective](https://opencollective.com/cited).

## Dev setup

```bash
# Clone and install
git clone https://github.com/trhoang220703/cited.git
cd cited
pnpm install

# Start local dev (web app)
pnpm dev

# Alternative: full self-host via Docker Compose (Postgres + Supabase stack)
docker compose up
```

Full self-host instructions will live in `docs/self-host.md` once the Phase 4 docs site lands. For now, see `apps/web/.env.example` for required environment variables.

## Branching + commits

- **Trunk-based development**: branch from `main`, keep branches short-lived.
- **Conventional Commits** enforced by `.husky/commit-msg`. Format: `type(scope): description`. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
- One logical change per commit. Squash fixup commits before requesting review.

## DCO sign-off (required)

Every commit must include a `Signed-off-by: Your Name <email@example.com>` trailer. This is the [Developer Certificate of Origin](https://developercertificate.org/) — by signing off you assert you wrote the code or have the right to submit it. Use `git commit -s`. Our DCO bot will block PRs without sign-off.

To add a sign-off to a commit you forgot:

```bash
git commit --amend -s
# or for multiple commits:
git rebase --signoff HEAD~N
```

## Relicense reservation

By contributing, you agree that the maintainers may relicense the project under any OSI-approved license at their discretion. This reservation exists so the project can adapt to legal or ecosystem shifts without re-collecting consent from every contributor. The codebase will always remain under an OSI-approved permissive or weak-copyleft license.

## Clip submission template

Non-code contributors can submit clip suggestions by opening a **Clip Submission** issue on GitHub. Use the structured form (`.github/ISSUE_TEMPLATE/clip_submission.yml`). Required fields:

| Field | Description |
|-------|-------------|
| `youtube_video_id` | The 11-character YouTube video ID (e.g., `dQw4w9WgXcQ`) |
| `start_seconds` | Clip start time in seconds |
| `end_seconds` | Clip end time in seconds |
| `claim` | One sentence ≤200 characters describing the specific health claim |
| `speaker` | Named credentialed guest (never just "DOAC host") |
| `speaker_credentials` | MD, RD, PhD, other credentialed, or host (no credential) |
| `domain` | One of: sleep, nutrition+gut, exercise+longevity, mental health |
| `risk_flags` | Any applicable flags: medical_advice, supplement, contraindication, fasting, sleep_pharmacology, hormones, none |
| `rationale` | Why this clip is useful for habit formation (2–5 sentences) |

Clips are reviewed by the editorial team. Clips touching supplements, fasting, hormones, sleep pharmacology, or mental-health interventions require a reviewer with MD, RD, or PhD credentials before approval. See [MEDICAL_REVIEW.md](./MEDICAL_REVIEW.md).

## Good first issue

Issues labeled [`good first issue`](https://github.com/trhoang220703/cited/issues?q=is%3Aissue+label%3A%22good+first+issue%22) are pre-vetted and scope-bounded. PRs for these issues are actively welcomed — no need to ask first.

## Code of Conduct

All contributors are expected to follow the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). Please report conduct issues to `conduct@cited.dev`.
