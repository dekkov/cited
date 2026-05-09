# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately to **security@cited.dev**. You will receive a response within 48 hours acknowledging receipt.

## Coordinated Disclosure

We follow a 90-day coordinated disclosure policy:

1. You report the vulnerability privately.
2. We acknowledge within 48 hours.
3. We investigate and develop a fix within 90 days (sooner for critical issues).
4. We notify you when the fix is released.
5. You may publish details after the fix is deployed, or after 90 days if unresolved.

For critical vulnerabilities that are being actively exploited, we may shorten the timeline.

## Scope

In scope:
- SQL injection, XSS, CSRF in `apps/web`
- Authentication bypasses (Supabase Auth integration)
- RLS policy bypasses that expose other users' data
- Secrets/API keys exposed in source code or build artifacts

Out of scope:
- Vulnerabilities in third-party services (Supabase, Vercel, OpenAI) — report those to the respective vendor
- Issues requiring physical access to a user's device
- Social engineering attacks

## Supported Versions

Only the latest `main` branch receives security fixes during pre-alpha. Once v1.0 is released, a supported versions table will be added here.

## Bug Bounty

There is no paid bug bounty program at this time.
