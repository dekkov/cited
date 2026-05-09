# Sub-processors

The hosted demo at `<demo-domain>` (to be set at Phase 4 alpha launch) uses the following sub-processors:

| Sub-processor | Purpose | Region | DPA |
|---------------|---------|--------|-----|
| Supabase Inc. | Postgres database, Auth (GoTrue), Storage | US/EU (configurable) | https://supabase.com/dpa |
| Vercel Inc. | Frontend hosting, edge functions | Global | https://vercel.com/legal/dpa |
| OpenAI, L.L.C. | Embeddings (`text-embedding-3-small`) | US | https://openai.com/policies/data-processing-addendum |
| Anthropic, PBC | Heavy LLM inference (Claude Sonnet / Haiku) | US | https://www.anthropic.com/legal/dpa |
| Resend | Transactional email (magic links, data export delivery) — Phase 4 | US/EU | https://resend.com/legal/dpa |
| Sentry (optional) | Error tracking (hosted demo only; self-hosters opt out via `SENTRY_DSN` env var) | US/EU | https://sentry.io/legal/dpa/ |

## Self-hosters

Self-hosters control their own sub-processor relationships. The Cited maintainers have no visibility into data processed on self-hosted instances. Self-hosters should review and document their own sub-processor list for GDPR compliance.

## Changes

We will provide advance notice of sub-processor additions or replacements to allow controllers time to object. Subscribe to releases on this repository to receive notifications.

_Last updated: 2026-05-08_
