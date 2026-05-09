---
phase: 01-foundation
plan: 02
subsystem: oss-legal
tags: [license, contributing, dco, privacy, gdpr, github-templates, sponsorship]

requires: [01-01]
provides:
  - MIT LICENSE (2026 Cited contributors)
  - README with solo-maintainer bandwidth statement, editorial policy links, sponsorship links
  - CONTRIBUTING.md with DCO sign-off requirement, relicense-reservation clause, clip-submission template
  - CODE_OF_CONDUCT.md (Contributor Covenant 2.1, conduct@cited.dev)
  - SECURITY.md (security@cited.dev, 90-day coordinated disclosure)
  - MEDICAL_REVIEW.md with MD/RD/PhD requirement, prescription/dosing hard exclusions, attribution rule
  - docs/legal/privacy-policy.md (GDPR-ready, Article 9, pgvector cascade-delete)
  - docs/legal/dpa.md (self-hoster and sponsor DPA stub)
  - docs/legal/sub-processors.md (Supabase, Vercel, OpenAI, Anthropic, Resend, Sentry)
  - docs/legal/right-of-publicity.md (named credentialed guest attribution, no endorsement)
  - docs/legal/self-host-referer-policy.md (Referrer-Policy guidance for YouTube embed)
  - .github/ISSUE_TEMPLATE/ (bug, feature, clip submission, config)
  - .github/PULL_REQUEST_TEMPLATE.md (DCO checklist, medical-review label trigger)
  - .github/workflows/dco.yml (shell-script DCO check, no external app required)
  - .github/FUNDING.yml (Open Collective + GitHub Sponsors — placeholders pending Task 4)
  - docs/oss/sponsorship.md (tier structure, burn-rate transparency stub)
affects: [01-07, 01-08]

tech-stack:
  added: []
  patterns:
    - DCO enforced via shell script in GitHub Actions workflow (no third-party bot required)
    - Contributor Covenant 2.1 fetched from official source (avoids content-filter issues on local generation)

key-files:
  created:
    - LICENSE
    - README.md
    - CONTRIBUTING.md
    - CODE_OF_CONDUCT.md
    - SECURITY.md
    - MEDICAL_REVIEW.md
    - docs/legal/privacy-policy.md
    - docs/legal/dpa.md
    - docs/legal/sub-processors.md
    - docs/legal/right-of-publicity.md
    - docs/legal/self-host-referer-policy.md
    - .github/ISSUE_TEMPLATE/bug_report.yml
    - .github/ISSUE_TEMPLATE/feature_request.yml
    - .github/ISSUE_TEMPLATE/clip_submission.yml
    - .github/ISSUE_TEMPLATE/config.yml
    - .github/PULL_REQUEST_TEMPLATE.md
    - .github/workflows/dco.yml
    - .github/FUNDING.yml
    - docs/oss/sponsorship.md
  modified: []

key-decisions:
  - "DCO enforced via shell script in dco.yml — no external GitHub App required; workflow is the binding gate"
  - "Contributor Covenant 2.1 fetched via curl from contributor-covenant.org — avoids LLM content filter on harassment/discrimination language"
  - "License decision: MIT confirmed per PROJECT.md locked decision"
  - "Open Collective slug: 'cited' (placeholder — replace after account creation in Task 4)"
  - "GitHub Sponsors: trhoang220703 (placeholder — replace after application approval)"
  - "Email aliases conduct@cited.dev and security@cited.dev are placeholders — need real routing configured (Task 4)"

requirements-completed: [OSS-01, OSS-02, OSS-03, OSS-04, OSS-05, OSS-07, OSS-09, LGL-04, LGL-05, LGL-06, LGL-07]

outstanding-todos:
  - "Task 4 (human-action checkpoint): Create Open Collective account, apply for GitHub Sponsors, set up conduct@/security@ email aliases, replace FUNDING.yml placeholders"
  - "LGL-08 (clip length guidance): Deferred to Phase 2 — placeholder note added to MEDICAL_REVIEW.md"
  - "DMCA agent registration: Deferred to Phase 2 — noted in right-of-publicity.md"
  - "docs/legal/dmca.md: Deferred to Phase 2 — noted in README"

duration: ~45min
completed: 2026-05-08
---

# Phase 01 Plan 02: OSS Legal Posture Summary

**MIT LICENSE, CONTRIBUTING (DCO + relicense reservation + clip-submission template), Contributor Covenant 2.1, MEDICAL_REVIEW, GDPR-ready privacy docs, GitHub issue/PR templates, DCO workflow, FUNDING.yml, and sponsorship stub — all committed before the first public push.**

## Performance

- **Duration:** ~45 min (including content-filter workaround for CoC)
- **Tasks:** 3 / 4 (Task 4 is a human-action checkpoint — see below)
- **Files created:** 19

## Accomplishments

- Full OSS legal posture landed: MIT license, DCO enforcement, relicense reservation, Contributor Covenant 2.1
- MEDICAL_REVIEW.md gates health-claim clips with MD/RD/PhD requirement and hard-blocks prescription/dosing content
- GDPR-ready privacy policy: Article 9, consent architecture (3 tiers), pgvector cascade-delete, data export note
- DPA stub for self-hosters and sponsors; named sub-processor list (Supabase, Vercel, OpenAI, Anthropic, Resend, Sentry)
- Right-of-publicity stance: named credentialed guest attribution, no endorsement, 48h takedown SLA
- Self-host Referer-Policy guidance: warns against `no-referrer`, provides Caddy/nginx/Cloudflare config snippets
- GitHub issue templates: bug, feature, clip submission (structured with speaker_credentials dropdown + risk_flags checkboxes)
- DCO check via shell script in GitHub Actions — no third-party app required
- FUNDING.yml + sponsorship deck stub with tier structure and burn-rate transparency commitment

## Notable Deviation

**Contributor Covenant via curl:** The LLM content filter blocked inline generation of CODE_OF_CONDUCT.md due to harassment/discrimination language in the Contributor Covenant text. Workaround: `curl` fetched the canonical text from `contributor-covenant.org` directly.

## Task 4 Checkpoint (Human Action Required)

The following external actions cannot be automated and are required before the first public push:

1. **Open Collective** — Create collective at opencollective.com/create, slug "cited", $0 goal. Update `.github/FUNDING.yml` if slug differs.
2. **GitHub Sponsors** — Apply at github.com/sponsors. Replace `trhoang220703` placeholder in FUNDING.yml once approved.
3. **Email aliases** — Set up `conduct@cited.dev` and `security@cited.dev` (or `+conduct`/`+security` personal filters) and update CODE_OF_CONDUCT.md + SECURITY.md.
4. **DCO verification** — Open a draft PR with an unsigned commit to confirm the dco.yml workflow blocks it.

Type `approved` (or `approved-pending` if Open Collective review is pending) to proceed to Wave 2.

## Self-Check: PASSED

All 19 required files found on disk. All 3 auto-task commits verified.

| File | Status |
|------|--------|
| LICENSE | FOUND |
| README.md | FOUND |
| CONTRIBUTING.md | FOUND |
| CODE_OF_CONDUCT.md | FOUND |
| SECURITY.md | FOUND |
| MEDICAL_REVIEW.md | FOUND |
| docs/legal/privacy-policy.md | FOUND |
| docs/legal/dpa.md | FOUND |
| docs/legal/sub-processors.md | FOUND |
| docs/legal/right-of-publicity.md | FOUND |
| docs/legal/self-host-referer-policy.md | FOUND |
| .github/ISSUE_TEMPLATE/bug_report.yml | FOUND |
| .github/ISSUE_TEMPLATE/feature_request.yml | FOUND |
| .github/ISSUE_TEMPLATE/clip_submission.yml | FOUND |
| .github/ISSUE_TEMPLATE/config.yml | FOUND |
| .github/PULL_REQUEST_TEMPLATE.md | FOUND |
| .github/workflows/dco.yml | FOUND |
| .github/FUNDING.yml | FOUND |
| docs/oss/sponsorship.md | FOUND |
