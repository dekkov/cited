# Privacy Policy

_Last updated: 2026-05-08_

Cited ("we", "our", "the project") is an open-source application. This privacy policy applies to the hosted demo instance. Self-hosters operate their own controller relationship — see `docs/legal/dpa.md`.

## Data We Collect

| Category | Data | Basis |
|----------|------|-------|
| Account | Email address, OAuth identity (Google subject ID), display name, timezone | Contract (account creation) |
| Profile | Health goals (JSON), onboarding responses | Consent (granular, per AUTH-05) |
| Activity | Check-in records (date, habit status, optional mood integer, optional free-text note) | Contract |
| Consent records | Timestamps and version of each consent granted or revoked | Legal obligation (GDPR Art. 7) |
| AI inputs | Free-text onboarding responses used for habit recommendation | Explicit consent (AUTH-05(c) — opt-in only) |
| Technical | Server logs (IP, user-agent, request path), error traces | Legitimate interest |

We do **not** collect payment information, physical location, or device identifiers.

## Special-Category Data (Article 9 GDPR)

Health-adjacent data (goals, check-ins, free-text notes) may constitute special-category data under GDPR Article 9. We collect it only under explicit, granular consent (AUTH-05). Users may withdraw consent and delete this data at any time.

## Consent Architecture

Three separate consent gates (AUTH-05):

1. **Account consent** — required to create an account (age gate, disclaimer acknowledgment)
2. **Health-adjacent consent** — required to use the habit tracker (check-ins, goals)
3. **AI free-text consent** — optional, required only if the user wants to share free-text notes with the AI for personalization

Each gate is recorded with a timestamp and consent version in `consent_records`.

## Data Retention

- Account data is retained while the account is active.
- On account deletion, all user rows (profile, check-ins, habits, consent records, pgvector embeddings of free-text) are cascade-deleted within **30 days** (PROF-04).
- Server logs are retained for 90 days.

## Data Export

Users may request a one-click JSON export of all their data (PROF-03). Implementation lands in Phase 4.

## Sub-processors

See [sub-processors.md](./sub-processors.md) for the full list of third-party processors used by the hosted demo.

## Your Rights (GDPR)

You have the right to: access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, and objection. To exercise any right, email **privacy@cited.dev** (placeholder — see Phase 4 for contact form).

## Children

Cited enforces a date-of-birth gate and does not knowingly collect data from users under 13 (COPPA) or under 16 in the EU (GDPR Art. 8). Accounts that fail the age gate are blocked at registration.

## Contact

**privacy@cited.dev** (placeholder)
