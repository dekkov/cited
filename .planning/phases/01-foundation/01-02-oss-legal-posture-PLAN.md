---
phase: 01-foundation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - LICENSE
  - README.md
  - CONTRIBUTING.md
  - CODE_OF_CONDUCT.md
  - MEDICAL_REVIEW.md
  - SECURITY.md
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
autonomous: false
requirements: [OSS-01, OSS-02, OSS-03, OSS-04, OSS-05, OSS-07, OSS-09, LGL-04, LGL-05, LGL-06, LGL-07]
must_haves:
  truths:
    - "Repo has MIT LICENSE before any public push"
    - "CONTRIBUTING.md includes DCO sign-off requirement, relicense-reservation clause, clip-submission template, and dev-setup pointer"
    - "DCO bot enforces Signed-off-by on every PR"
    - "CODE_OF_CONDUCT.md is Contributor Covenant 2.1"
    - "README.md states the maintainer-bandwidth budget (~2h/week triage, solo)"
    - "MEDICAL_REVIEW.md exists with reviewer-credential requirements (MD/RD/PhD for supplements/fasting)"
    - "Privacy policy + DPA + sub-processor list (Supabase, Vercel, OpenAI/Anthropic, Resend) are published"
    - "Right-of-publicity stance is published: clips attribute named credentialed guest, never imply endorsement"
    - "Self-host docs include Referer-Policy guidance for YouTube embed"
    - "Open Collective + GitHub Sponsors links live in .github/FUNDING.yml with $0 goal"
  artifacts:
    - path: "LICENSE"
      provides: "MIT license text"
      contains: "MIT License"
    - path: "CONTRIBUTING.md"
      provides: "DCO + relicense-reservation + clip submission + dev setup"
      contains: "Signed-off-by"
    - path: "CODE_OF_CONDUCT.md"
      provides: "Contributor Covenant 2.1"
      contains: "Contributor Covenant"
    - path: "MEDICAL_REVIEW.md"
      provides: "Editorial & Attribution Policy with reviewer credentials"
      contains: "MD"
    - path: "README.md"
      provides: "Project overview + maintainer-bandwidth statement + sponsorship + self-host pointer"
      contains: "solo maintainer"
    - path: ".github/workflows/dco.yml"
      provides: "GitHub Action that fails PRs missing Signed-off-by"
      contains: "Signed-off-by"
    - path: ".github/FUNDING.yml"
      provides: "Open Collective + GitHub Sponsors links"
      contains: "open_collective"
    - path: "docs/legal/sub-processors.md"
      provides: "Named sub-processor list"
      contains: "Supabase"
  key_links:
    - from: "README.md"
      to: "CONTRIBUTING.md"
      via: "Contributing section links"
      pattern: "CONTRIBUTING.md"
    - from: "README.md"
      to: "MEDICAL_REVIEW.md"
      via: "Editorial policy section links"
      pattern: "MEDICAL_REVIEW.md"
    - from: "README.md"
      to: "docs/oss/sponsorship.md"
      via: "Sponsorship section links sponsorship deck stub"
      pattern: "sponsorship"
    - from: "CONTRIBUTING.md"
      to: ".github/workflows/dco.yml"
      via: "Sign-off instructions reference DCO bot"
      pattern: "DCO"
---

<objective>
Land the OSS legal + community posture before the first public push: MIT LICENSE, CONTRIBUTING.md (with DCO + relicense-reservation + clip-submission template), CODE_OF_CONDUCT.md, MEDICAL_REVIEW.md, SECURITY.md, privacy policy + DPA + sub-processor list, right-of-publicity stance, self-host Referer-Policy guidance, issue/PR templates, DCO GitHub Action, and Open Collective + GitHub Sponsors funding config — plus a README with explicit maintainer-bandwidth statement.

Purpose: Phase 1 success criteria #3. Mitigates Pitfall 1 (three-layer legal posture), Pitfall 6 (license late), Pitfall 7 (solo-maintainer triage spiral). Locked decisions from PROJECT.md: MIT + DCO + relicense-reservation; sponsorship in scope.
Output: A repo whose `/`, `/docs/legal/`, and `/.github/` surfaces are publication-ready.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/PROJECT.md
@/home/king/Hdiary/.planning/ROADMAP.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md

# This plan runs in parallel with 01-01 (no shared files except .github/workflows/* — both add new files, no edit collisions)
# Project working name = "Cited" (per PROJECT.md and NAMING.md). Use working name "Cited" consistently. Final rename in Phase 4.
</context>

<tasks>

<task type="auto">
  <name>Task 1: LICENSE + README + CONTRIBUTING + CODE_OF_CONDUCT + SECURITY</name>
  <files>LICENSE, README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md</files>
  <read_first>/home/king/Hdiary/.planning/PROJECT.md, /home/king/Hdiary/.planning/REQUIREMENTS.md, /home/king/Hdiary/.planning/NAMING.md</read_first>
  <action>
1. `LICENSE`: Standard MIT license text. Copyright line: `Copyright (c) 2026 Cited contributors`. Use the canonical SPDX MIT text (no modifications).

2. `README.md` sections (in this order):
   - Title: `# Cited` with one-line tagline ("Habits backed by people who study this for a living.")
   - Status badge row: License (MIT), CI status placeholder, Open Collective placeholder
   - **What this is** (2 paragraphs from PROJECT.md "What This Is")
   - **Status**: "Pre-alpha. Schema + auth + repo posture are landing in Phase 1; ≥30 curated clips arrive in Phase 2; demo-able user loop in Phase 3. See [.planning/ROADMAP.md](.planning/ROADMAP.md)."
   - **Getting started** (one-command quickstart pointing at `pnpm install && pnpm dev` — full instructions live in `docs/quickstart.md`, deferred to Phase 4 docs site)
   - **Maintainer bandwidth** (verbatim, OSS-07 — DO NOT soften):
     > **Solo maintainer.** I have ~2 hours/week for issue triage and PR review. Please be patient — see [CONTRIBUTING.md](./CONTRIBUTING.md) for how to make your contribution reviewable in that budget. If you need a faster turnaround, sponsoring via Open Collective unlocks dedicated time.
   - **Editorial policy**: link to `MEDICAL_REVIEW.md`
   - **Legal posture**: link to `docs/legal/privacy-policy.md`, `docs/legal/right-of-publicity.md`, `docs/legal/dmca.md` (DMCA file lands in Phase 2 — leave note "see Phase 2 for /legal/dmca")
   - **Contributing**: link to `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`
   - **Sponsorship**: link to `docs/oss/sponsorship.md` and Open Collective + GitHub Sponsors (placeholder URLs marked `<!-- TODO: replace after account setup checkpoint -->`)
   - **License**: MIT, link to LICENSE

3. `CONTRIBUTING.md` sections:
   - **Welcome** (1 paragraph)
   - **Maintainer bandwidth note** (mirror README — set expectations)
   - **Dev setup**: `pnpm install`, `pnpm dev`, `docker compose up` alternative (link to docs/self-host.md once it exists in Phase 4)
   - **Branching + commits**: trunk-based; Conventional Commits enforced by `.husky/commit-msg`
   - **DCO sign-off** (REQUIRED, copy verbatim — this is the legal hook):
     > Every commit must include a `Signed-off-by: Your Name <email@example.com>` trailer. This is the [Developer Certificate of Origin](https://developercertificate.org/) — by signing off you assert you wrote the code or have the right to submit it. Use `git commit -s`. Our DCO bot will block PRs without sign-off.
   - **Relicense reservation** (REQUIRED, verbatim):
     > By contributing, you agree that the maintainers may relicense the project under any OSI-approved license at their discretion. This reservation exists so the project can adapt to legal or ecosystem shifts without re-collecting consent from every contributor. The codebase will always remain under an OSI-approved permissive or weak-copyleft license.
   - **Clip submission template** (for non-code contributors): a markdown form with fields `youtube_video_id`, `start_seconds`, `end_seconds`, `claim` (1 sentence), `speaker` (named guest, never just "DOAC host"), `speaker_credentials` (MD/PhD/RD/none), `domain` (sleep | nutrition+gut | exercise+longevity | mental health), `risk_flags`, `rationale`. Submit by opening a Clip Submission issue.
   - **Good first issue convention**: issues tagged `good first issue` are pre-vetted; PRs welcome.
   - **Code of Conduct**: link to `CODE_OF_CONDUCT.md`.

4. `CODE_OF_CONDUCT.md`: Contributor Covenant version 2.1, verbatim. Replace contact email with `conduct@cited.dev` (placeholder — flag in checkpoint).

5. `SECURITY.md`: Vulnerability disclosure to `security@cited.dev` (placeholder, flag in checkpoint). 90-day coordinated disclosure.
  </action>
  <acceptance_criteria>
- `test -f LICENSE && grep -q "MIT License" LICENSE && grep -q "Permission is hereby granted" LICENSE`
- `grep -q "Cited contributors" LICENSE`
- `grep -q "solo maintainer" README.md` (case-insensitive: `grep -qi`)
- `grep -q "CONTRIBUTING.md" README.md`
- `grep -q "MEDICAL_REVIEW.md" README.md`
- `grep -q "Open Collective" README.md`
- `grep -q "Signed-off-by" CONTRIBUTING.md`
- `grep -q "Developer Certificate of Origin" CONTRIBUTING.md`
- `grep -q "relicense" CONTRIBUTING.md` (case-insensitive)
- `grep -q "clip submission" CONTRIBUTING.md` (case-insensitive)
- `grep -q "good first issue" CONTRIBUTING.md`
- `grep -q "Contributor Covenant" CODE_OF_CONDUCT.md`
- `grep -q "2.1" CODE_OF_CONDUCT.md`
- `test -f SECURITY.md && grep -qi "vulnerability" SECURITY.md`
  </acceptance_criteria>
  <done>Five top-level docs land with MIT + DCO + relicense reservation + maintainer bandwidth statement + clip submission template.</done>
</task>

<task type="auto">
  <name>Task 2: MEDICAL_REVIEW.md + legal docs (privacy / DPA / sub-processors / right-of-publicity / Referer-Policy)</name>
  <files>MEDICAL_REVIEW.md, docs/legal/privacy-policy.md, docs/legal/dpa.md, docs/legal/sub-processors.md, docs/legal/right-of-publicity.md, docs/legal/self-host-referer-policy.md</files>
  <read_first>/home/king/Hdiary/.planning/PROJECT.md, /home/king/Hdiary/.planning/REQUIREMENTS.md, /home/king/Hdiary/CLAUDE.md</read_first>
  <action>
1. `MEDICAL_REVIEW.md` (LGL-05; LGL-08 length guidance is added in Phase 2 — note this here):
   - **Purpose**: editorial gate for clips touching health claims.
   - **Reviewer credentials**: clips touching supplements, fasting, hormones, mental-health interventions, or sleep pharmacology require a reviewer with **MD, RD, or PhD in a relevant field** before approval. List "credentialed reviewer pool" as TODO until first reviewer onboarded.
   - **Hard exclusions** (binding, hard-blocked at clip approval per ADMN-06 in Phase 2): prescription drugs, dosing instructions, treatment of diagnosed conditions.
   - **Disclaimer**: Cited is not medical advice. Users must consult a doctor before changing health habits.
   - **Reviewer process**: PRs touching clip text or risk_flags are labeled `needs-medical-review`; merge blocked until a reviewer with the required credential approves.
   - **Speaker attribution rule** (LGL-06 cross-reference): clips attribute the **named credentialed guest**, never the host, never imply endorsement.
   - **Length guidance**: "TBD in Phase 2 (LGL-08) — placeholder: as detailed as needed to convey the claim, not more."

2. `docs/legal/privacy-policy.md` (LGL-04, GDPR-ready skeleton):
   - Data we collect: email, magic-link token, OAuth identity (Google subject), profile (display name, timezone, goals JSON), consent records (timestamps), check-ins (status + optional mood + optional free-text), free-text inputs to AI (only if AUTH-05(c) opted in).
   - Article 9 / special-category data: explicitly named. Granular consent gating (account / health-adjacent / AI free-text) per AUTH-05.
   - Cascade-erasure: account deletion removes all rows including pgvector embeddings of free-text within 30 days (PROF-04).
   - Data export: one-click JSON (PROF-03 — implementation lands in Phase 4).
   - Retention: account data retained while account active; deleted within 30d on request.
   - Sub-processor link.

3. `docs/legal/dpa.md` (Data Processing Addendum stub for self-hosters and sponsors):
   - Roles: self-host operator = controller; Cited maintainers = no data access on user instances.
   - Hosted-demo controller: Cited maintainers (until alpha launch in Phase 4).
   - Sub-processor list link.
   - Right of audit, breach notification (72h), data export on request.

4. `docs/legal/sub-processors.md`:
   ```markdown
   # Sub-processors

   The hosted demo at <demo-domain> uses these sub-processors:

   | Sub-processor | Purpose | Region | DPA |
   |---------------|---------|--------|-----|
   | Supabase Inc. | Postgres, Auth, Storage | US/EU (configurable) | https://supabase.com/dpa |
   | Vercel Inc. | Frontend hosting, edge | Global | https://vercel.com/legal/dpa |
   | OpenAI, L.L.C. | Embeddings (`text-embedding-3-small`) | US | https://openai.com/policies/data-processing-addendum |
   | Anthropic, PBC | Heavy LLM (Claude Sonnet/Haiku) | US | https://www.anthropic.com/legal/dpa |
   | Resend | Transactional email (Phase 4) | US/EU | https://resend.com/legal/dpa |
   | Sentry (optional) | Error tracking (hosted demo only; opt-out for self-hosters) | US/EU | https://sentry.io/legal/dpa/ |

   Self-hosters control their own sub-processor list.
   ```

5. `docs/legal/right-of-publicity.md` (LGL-06):
   - Cited displays clips that attribute the **named credentialed guest** (not the host).
   - Cited never implies endorsement of the app by any host or guest.
   - Cited never uses guest likenesses in marketing material outside the clip-card surface.
   - Takedown process: any guest can request removal via the DMCA / takedown form; 48-hour SLA.

6. `docs/legal/self-host-referer-policy.md` (LGL-07):
   - YouTube IFrame requires the embedding origin to send a `Referer` header. Recommended: `Referrer-Policy: strict-origin-when-cross-origin` (Next.js default with `<YouTubeEmbed>`).
   - Specifically warn: do NOT set `Referrer-Policy: no-referrer` — YouTube will refuse to play and the user sees a black box.
   - For Caddy / nginx self-hosters, copy-paste header config.
   - For Cloudflare proxy users, note the "Strict transport security" + "Referrer Policy" page-rule equivalents.
  </action>
  <acceptance_criteria>
- `test -f MEDICAL_REVIEW.md && grep -qE "MD|RD|PhD" MEDICAL_REVIEW.md`
- `grep -q "prescription" MEDICAL_REVIEW.md && grep -q "dosing" MEDICAL_REVIEW.md`
- `grep -q "named credentialed guest" MEDICAL_REVIEW.md`
- `test -f docs/legal/privacy-policy.md && grep -q "Article 9" docs/legal/privacy-policy.md`
- `grep -q "pgvector" docs/legal/privacy-policy.md`
- `test -f docs/legal/dpa.md`
- `test -f docs/legal/sub-processors.md && grep -q "Supabase" docs/legal/sub-processors.md && grep -q "OpenAI" docs/legal/sub-processors.md && grep -q "Anthropic" docs/legal/sub-processors.md && grep -q "Vercel" docs/legal/sub-processors.md`
- `test -f docs/legal/right-of-publicity.md && grep -qi "endorsement" docs/legal/right-of-publicity.md`
- `test -f docs/legal/self-host-referer-policy.md && grep -q "Referrer-Policy" docs/legal/self-host-referer-policy.md && grep -qi "no-referrer" docs/legal/self-host-referer-policy.md`
  </acceptance_criteria>
  <done>Editorial policy + 5 legal docs land with concrete content, named sub-processors, and Referer-Policy guidance.</done>
</task>

<task type="auto">
  <name>Task 3: Issue/PR templates + DCO GitHub Action + FUNDING.yml + sponsorship deck stub</name>
  <files>.github/ISSUE_TEMPLATE/bug_report.yml, .github/ISSUE_TEMPLATE/feature_request.yml, .github/ISSUE_TEMPLATE/clip_submission.yml, .github/ISSUE_TEMPLATE/config.yml, .github/PULL_REQUEST_TEMPLATE.md, .github/workflows/dco.yml, .github/FUNDING.yml, docs/oss/sponsorship.md</files>
  <read_first>/home/king/Hdiary/CONTRIBUTING.md (from Task 1), /home/king/Hdiary/.planning/REQUIREMENTS.md</read_first>
  <action>
1. `.github/ISSUE_TEMPLATE/bug_report.yml`: structured form with fields `description`, `repro_steps`, `expected`, `actual`, `environment` (browser, OS, self-host vs hosted), `logs`. Labels `bug`, `triage`.

2. `.github/ISSUE_TEMPLATE/feature_request.yml`: fields `problem`, `proposed_solution`, `alternatives_considered`, `would_you_PR_this` (yes/no). Labels `enhancement`, `triage`.

3. `.github/ISSUE_TEMPLATE/clip_submission.yml`: structured form for non-coders matching CONTRIBUTING.md template:
   - `youtube_video_id` (required text)
   - `start_seconds`, `end_seconds` (required numbers)
   - `claim` (required, 1 sentence ≤200 chars)
   - `speaker` (required text — named credentialed guest)
   - `speaker_credentials` (dropdown: MD | RD | PhD | other_credentialed | host_no_credential)
   - `domain` (dropdown: sleep | nutrition+gut | exercise+longevity | mental health)
   - `risk_flags` (multi-checkbox: medical_advice, supplement, contraindication, fasting, sleep_pharmacology, hormones, none)
   - `rationale` (textarea, required)
   - Labels `clip-submission`, `needs-medical-review`, `triage`.

4. `.github/ISSUE_TEMPLATE/config.yml`:
   ```yaml
   blank_issues_enabled: false
   contact_links:
     - name: Security disclosure
       url: https://github.com/<org>/cited/security/advisories/new
       about: Please report vulnerabilities privately, not as public issues.
     - name: Code of Conduct
       url: https://github.com/<org>/cited/blob/main/CODE_OF_CONDUCT.md
       about: Conduct issues should go directly to conduct@cited.dev.
   ```

5. `.github/PULL_REQUEST_TEMPLATE.md`:
   - **What** (1-2 sentences)
   - **Why** (link to issue / requirement REQ-ID)
   - **Tests** (what tests were added/run)
   - **Checklist**:
     - [ ] DCO sign-off on every commit (`git commit -s`)
     - [ ] Conventional commit messages
     - [ ] `pnpm lint typecheck test` passes
     - [ ] If touches clip text or risk_flags: `needs-medical-review` label applied
     - [ ] If touches privacy/legal docs: legal-review applied

6. `.github/workflows/dco.yml`:
   ```yaml
   name: DCO
   on:
     pull_request:
       branches: [main]
       types: [opened, synchronize, reopened]
   jobs:
     dco-check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
             ref: ${{ github.event.pull_request.head.sha }}
         - name: Verify Signed-off-by on every commit
           env:
             BASE_SHA: ${{ github.event.pull_request.base.sha }}
             HEAD_SHA: ${{ github.event.pull_request.head.sha }}
           run: |
             missing=0
             for commit in $(git rev-list "$BASE_SHA..$HEAD_SHA"); do
               if ! git log -1 --format=%B "$commit" | grep -qE "^Signed-off-by: .+ <.+@.+>$"; then
                 echo "::error::Commit $commit missing Signed-off-by trailer"
                 missing=$((missing+1))
               fi
             done
             if [ "$missing" -gt 0 ]; then
               echo "Run 'git commit --amend -s' (or rebase with -s) and force-push. See CONTRIBUTING.md."
               exit 1
             fi
   ```

7. `.github/FUNDING.yml`:
   ```yaml
   github: [<placeholder-username>]
   open_collective: cited
   custom: ["https://cited.dev/sponsor"]
   ```
   Add a `<!-- TODO: replace placeholders after Open Collective + GitHub Sponsors accounts created (see checkpoint in Task 4) -->` comment above.

8. `docs/oss/sponsorship.md` (stub for OSS-09; OSS-11 full deck lands in Phase 4):
   - Why sponsor (no VC, no paid tiers, sponsorship covers hosting + LLM)
   - **Current burn rate**: TBD (filled in once hosted demo is live, Phase 4)
   - **Suggested tiers**: $5/mo (acknowledges support), $25/mo (covers ~LLM bill), $100/mo (covers hosting + LLM at projected alpha scale), $500/mo (logo wall)
   - **Goal**: $0 explicit goal at launch — transparency over targets
   - Open Collective link, GitHub Sponsors link (placeholders).
  </action>
  <acceptance_criteria>
- `test -f .github/ISSUE_TEMPLATE/bug_report.yml && grep -q "name:" .github/ISSUE_TEMPLATE/bug_report.yml`
- `test -f .github/ISSUE_TEMPLATE/feature_request.yml`
- `test -f .github/ISSUE_TEMPLATE/clip_submission.yml && grep -q "youtube_video_id" .github/ISSUE_TEMPLATE/clip_submission.yml && grep -q "speaker_credentials" .github/ISSUE_TEMPLATE/clip_submission.yml`
- `test -f .github/ISSUE_TEMPLATE/config.yml && grep -q "blank_issues_enabled: false" .github/ISSUE_TEMPLATE/config.yml`
- `test -f .github/PULL_REQUEST_TEMPLATE.md && grep -q "DCO sign-off" .github/PULL_REQUEST_TEMPLATE.md`
- `test -f .github/workflows/dco.yml && grep -q "Signed-off-by" .github/workflows/dco.yml`
- `test -f .github/FUNDING.yml && grep -q "open_collective" .github/FUNDING.yml`
- `test -f docs/oss/sponsorship.md && grep -qi "sponsor" docs/oss/sponsorship.md`
  </acceptance_criteria>
  <done>Issue/PR templates, DCO bot workflow, FUNDING.yml, and sponsorship deck stub all land.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 4: User checkpoint — external account creation (Open Collective, GitHub Sponsors, DCO bot install, conduct/security email)</name>
  <what-built>All in-repo OSS posture (LICENSE, CONTRIBUTING, CoC, DCO workflow, FUNDING.yml placeholders, MEDICAL_REVIEW, legal docs, issue/PR templates) is committed. The remaining items require human-only actions on external services that have no CLI/API for the relevant flows.</what-built>
  <how-to-verify>
The user must complete these steps and then update the placeholders. Each is a separate human-only step:

1. **Open Collective** (OSS-09):
   - Visit https://opencollective.com/create
   - Create collective named "Cited" (or current working name) under the "Open Source" category
   - Set goal to $0 (transparency over targets — per PROJECT.md sponsorship decision)
   - Copy the slug (e.g., `cited`) and replace `open_collective: cited` in `.github/FUNDING.yml` if different.

2. **GitHub Sponsors** (OSS-09):
   - Visit https://github.com/sponsors and apply for the user account
   - Once approved, replace `<placeholder-username>` in `.github/FUNDING.yml` with the actual GitHub username.

3. **Repo email aliases**:
   - Set up `conduct@cited.dev` and `security@cited.dev` (or temporary substitutes — e.g., a personal address with a `+conduct` / `+security` filter) and update `CODE_OF_CONDUCT.md` and `SECURITY.md`.

4. **DCO bot** (OSS-03):
   - The `.github/workflows/dco.yml` GitHub Action shipped in Task 3 enforces DCO without a separate bot install. **No external app needed.** Verify by opening a draft PR with a commit lacking `Signed-off-by` — it must fail.
   - Optional: install the DCO GitHub App from https://github.com/apps/dco for richer status checks, but the workflow is the binding gate.

5. Confirm `.github/FUNDING.yml` no longer contains the `<placeholder>` string.

6. Confirm sponsor link in README points at the live Open Collective URL.
  </how-to-verify>
  <resume-signal>Type "approved" once placeholders are replaced. If Open Collective application is pending review, type "approved-pending" and add a TODO note in README's sponsorship section.</resume-signal>
</task>

</tasks>

<verification>
1. `grep -L "MIT License" LICENSE` — exits with status indicating match present
2. `grep -q "Signed-off-by" CONTRIBUTING.md && grep -q "relicense" CONTRIBUTING.md`
3. Open a test branch, push a commit without `-s`, open a draft PR — DCO workflow fails
4. `cat docs/legal/sub-processors.md` lists all 5 named sub-processors
5. After Task 4, `grep -L "<placeholder>" .github/FUNDING.yml` shows no placeholder remains
6. `MEDICAL_REVIEW.md` enumerates MD/RD/PhD requirement and prescription/dosing exclusion
</verification>

<success_criteria>
- All 11 requirements covered (OSS-01..05, OSS-07, OSS-09, LGL-04..07)
- Repo passes a "would I be embarrassed by the first public push?" review
- DCO bot demonstrably blocks unsigned commits
- Sponsorship live or queued (Task 4 captures any blocked external-account state)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md` documenting:
- Final license decision (MIT confirmed)
- DCO enforcement mechanism (workflow path + behavior)
- Open Collective + GitHub Sponsors URLs (or "pending review" if applicable)
- Email aliases configured
- Outstanding TODOs (e.g., LGL-08 length guidance is added in Phase 2 plan)
</output>
