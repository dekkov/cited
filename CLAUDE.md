<!-- GSD:project-start source:PROJECT.md -->
## Project

**Hdiary (working title)**

An open-source, evidence-backed health habit tracker. Each recommended habit is grounded in a short, deep-linked clip from a credentialed health podcast — at MVP, exclusively *The Diary of a CEO* (DOAC) — so users can see the *why* behind every habit in 90 seconds. AI conducts a personalized onboarding interview, recommends habits with podcast-clip citations, and offers an "equivalent-benefit swap" when a habit doesn't fit a user's life. Target user: health-podcast listeners who consume hours of expert content but rarely operationalize anything.

**Core Value:** **Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker.** If the evidence layer fails or feels generic, the project has no differentiator. Everything else (community, mobile polish, AI extraction pipeline) is downstream of this working.

### Constraints

- **Capacity**: Solo, ~25 hrs/week — every scope decision is a time decision. Strict v1 cuts are non-negotiable.
- **Budget**: Free-tier-feasible MVP target (~$5/mo), beta target ~$45/mo. **No paid tiers, no VC**, but sponsorship is in scope to cover hosting + LLM costs as the project grows. Open Collective + GitHub Sponsors from launch with transparent burn-rate.
- **Legal/copyright**: Deep-link only. Never store or serve audio/video. Transcripts stored privately as analysis input. Clip length is **as detailed as needed to convey the claim, not more** — no hard cap, but editorial guidance favors brevity where the claim is short. Fair-use posture rests on factors 1 (transformative — habit operationalization with commentary) and 4 (no market harm — drives traffic back to DOAC), since factor 3 (amount) is weaker without a length cap. Active DMCA process + 48h SLA.
- **Health/medical**: Not medical advice. No prescription-drug or dosing content. Mandatory disclaimer + risk-flag system. Editorial policy documented.
- **Privacy/data**: GDPR-ready from v1 (export, delete, DPA, COPPA gate). Supabase TDE encrypts at rest.
- **DOAC-friendly**: License must not lock DOAC out of using/forking/integrating without copyleft burden. License default leans MIT/Apache-2.0 over AGPL-3.0.
- **OSS contributor-friendly**: One-command local dev, monorepo, conventional commits, "good first issue" path, clip-submission template for non-coders.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Self-Host Friction Budget
| Dep | Self-host story | Friction |
|-----|-----------------|----------|
| Postgres + pgvector | `pgvector/pgvector` Docker image | None |
| Supabase (Auth + Storage + RLS) | Official `docker compose` stack works, ~10 containers | Moderate (heavy local footprint) |
| Drizzle | Pure TypeScript lib | None |
| Next.js / Tailwind / shadcn | Static deps | None |
| OpenAI / Anthropic APIs | Requires API keys | High — but unavoidable for AI features at MVP; document local-LLM mode as a v2 contributor task |
| Inngest (if used) | Self-host single-binary (1.0+) | Low |
| Trigger.dev (alternative) | Self-host via Docker | Low |
| Supabase pg_cron | Built-in to Supabase | None (already paying the Supabase tax) |
| Cloudflare R2 | Not self-hostable; can substitute MinIO locally | Moderate (deferred — extraction pipeline is v0.5) |
| Resend (transactional email) | Not self-hostable; can swap for SMTP | Low — abstract behind interface |
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | **16.x** (App Router) | Web framework for `apps/web` and `apps/admin` | Current stable as of 2026; App Router stable; Turbopack default; React Compiler 1.0 stable. Solo dev's strongest stack. **Drift from artifact (which said 15) — bump to 16 from day 1; no reason to ship on a now-prior major.** |
| **React** | **19.x** | UI library | Required by Next.js 16; brings Server Components, Actions, `use()`. |
| **TypeScript** | **5.6+** (strict) | Type system | Non-negotiable for solo OSS — documents intent, prevents drift. Use `strict: true` from day 1. |
| **Tailwind CSS** | **v4.x** | Styling | v4 stable; Oxide engine (10x faster builds); CSS-first config. shadcn/ui has full v4 support. **Drift from artifact (didn't pin a version) — go v4 from day 1, not v3.** |
| **shadcn/ui** | latest CLI (copy-paste model, no version pinning) | Component primitives | Active maintenance; updated for Tailwind v4 + React 19; uses Radix UI under the hood (accessibility for free). Copy-paste model means *you own the components* — perfect for OSS forks. **Artifact recommendation holds.** |
| **Postgres** | **17.3+** | Primary datastore | Required floor for clean pgvector 0.8.x compatibility (17.0–17.2 had a linker bug). Supabase tracks recent majors. |
| **pgvector** | **0.8.2** | Vector similarity for RAG | HNSW index is 2026 default (better recall + lower latency than IVFFlat); 0.8 added iterative index scans (prevents overfiltering when combining vector search with WHERE clauses — critical for RAG with metadata filters like domain/speaker/risk). **Artifact recommendation holds; pin 0.8.2 minimum.** |
| **Supabase** | hosted (Pro tier when needed) + self-host compose | Auth, Postgres host, RLS, Storage | Single box covers auth + db + RLS + storage. RLS lets the admin/curator role be policed at DB level instead of in app code. **Artifact recommendation holds for MVP.** Watch the self-host footprint — 10 containers is heavy. |
| **Supabase Auth** | bundled | User auth (magic link + Google OAuth) | Fits `PROJECT.md` requirements verbatim; integrates with RLS for free; `@supabase/ssr` package is the canonical Next.js App Router integration. **Artifact recommendation holds — see "Auth alternatives" below for why Better Auth was considered and rejected for *this* project.** |
| **Drizzle ORM** | **0.36+** | Type-safe SQL & migrations | SQL-shaped TS API (no ORM-isms hiding pgvector / tsvector / JSONB); tiny edge-runtime bundle; `drizzle-kit` migrations are plain SQL files (reviewable in PRs). For a Postgres-feature-heavy app (pgvector + tsvector + RLS policies), Drizzle's "thin layer over SQL" stance pays off. **Artifact recommendation holds — see Prisma alternative below.** |
| **OpenAI `text-embedding-3-small`** | API | Embeddings for clip RAG | $0.02 / 1M tokens; 1536 dims; 8191-token context (more than enough for 90-sec clips); MTEB 62.26. Best price/integration ratio for RAG. **Artifact recommendation holds — see Voyage alternative below.** |
| **Anthropic Claude Sonnet 4.x** | API | Heavy LLM tasks (claim extraction in v0.5, complex reasoning) | Best general reasoning per dollar at this writing; Anthropic ecosystem matches the user's existing skill set. **Artifact recommendation holds.** |
| **Claude Haiku 4.5 / GPT-4o-mini** | API | Onboarding interview turns, swap suggestions | Cheap-per-turn for the conversational endpoints where latency and cost matter more than peak reasoning. **Artifact recommendation holds.** |
| **YouTube IFrame Player API** + `lite-youtube-embed` (via Next.js `<YouTubeEmbed>`) | n/a | Deep-link clip playback | Lite-embed loads a thumbnail facade (~500KB savings per video), defers iframe load until click — critical when habit feed and public habit pages render multiple clips. Next.js ships `<YouTubeEmbed>` from `@next/third-parties` that wraps this. **Drift from artifact (didn't specify lite-embed) — make this the standard from day 1.** |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`@supabase/ssr`** | latest | App Router-compatible Supabase client | Anywhere a server component, server action, or route handler needs the user session |
| **`@supabase/supabase-js`** | latest | Browser-side client | Client components that need realtime or direct queries |
| **`drizzle-orm`** + **`drizzle-kit`** | latest | ORM + migrations | All DB access goes through Drizzle except Supabase Auth's own tables |
| **`postgres`** (driver) | latest | Drizzle's preferred Postgres driver | Use `prepare: false` with Supabase pooled connections (transaction mode) |
| **`@next/third-parties`** (`YouTubeEmbed`) | latest | Lite YouTube embed | Every place a clip renders — habit cards, public `/h/[slug]` pages, admin preview |
| **`zod`** | 3.x | Schema validation | All API route handlers; LLM structured outputs; form validation |
| **`react-hook-form`** + `@hookform/resolvers/zod` | latest | Forms | Onboarding interview, admin clip editor, settings |
| **`@tanstack/react-query`** | 5.x | Client-side data fetching/caching | Daily check-in interactions, swap requests; *not* needed for SSR-driven pages |
| **`vercel/ai`** SDK (`ai` package) | 6.x | Streaming LLM responses + tool calling | Onboarding interview chat; swap reasoning |
| **`resend`** + **`react-email`** | latest | Transactional email | Magic-link customization, GDPR data-export delivery, weekly digest (post-v1). Abstract behind a small interface so SMTP can be swapped in for self-hosters. |
| **`pino`** + **`pino-pretty`** | latest | Structured logging | Server logging across web + admin + worker |
| **`@sentry/nextjs`** | latest | Error tracking | Hosted demo only; opt-out for self-hosters via env var |
| **`vitest`** + **`@testing-library/react`** | latest | Unit + component tests | All `packages/*` and component tests |
| **`playwright`** | latest | E2E tests | Critical flows: onboarding, daily check-in, swap, admin clip publish |
| **`lucide-react`** | latest | Icons | shadcn/ui's default icon set |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Fast, disk-efficient, the de-facto monorepo PM. **Artifact recommendation holds.** |
| **Turborepo** | Monorepo task runner | Caching dev/build/test across `apps/*` and `packages/*`. **Artifact recommendation holds.** |
| **Biome** (or ESLint + Prettier) | Lint + format | **Recommendation: Biome** — single binary, 10–100x faster than ESLint+Prettier, no config sprawl. ESLint is acceptable if a needed rule isn't in Biome yet. |
| **TypeScript Project References** | Cross-package types | Required for clean monorepo build graph |
| **Husky** + **lint-staged** | Pre-commit hooks | Run Biome + tsc on staged files |
| **Docker Compose** | Local self-host path | Required by `PROJECT.md`; spin up Postgres + pgvector + Supabase + the worker stub |
| **GitHub Actions** | CI | Lint, typecheck, test, build on every PR; deploy preview to Vercel |
| **Drizzle Studio** | DB introspection | `pnpm drizzle-kit studio` — better DX than Supabase Studio for schema work |
## Installation Sketch
# Monorepo bootstrap
# apps/web (and apps/admin)
# shadcn/ui (copy-paste — not a dep)
# Testing
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative | Verdict for Hdiary |
|-------------|-------------|-------------------------|--------------------|
| **Drizzle** | **Prisma 6.x** | Teams that need polished migration UX, Prisma Accelerate connection pooling, Prisma Studio | **Stay with Drizzle.** Hdiary leans heavily on Postgres-native features (pgvector cosine, tsvector hybrid search, RLS policies, JSONB user goals). Drizzle exposes these as first-class SQL; Prisma's `Unsupported("vector")` escape hatch and required raw queries fight the abstraction. Prisma's edge bundle is also ~10× larger. |
| **Supabase Auth** | **Better Auth** | New TS-first projects without an existing auth platform; want passkeys, RBAC, organizations out of the box; will own the auth code | **Stay with Supabase Auth for MVP.** The Auth.js team merged into Better Auth in Sept 2025, and Better Auth is the recommended forward path for greenfield Next.js projects in general. BUT: Hdiary already pays the Supabase tax for Postgres + RLS + Storage; using Supabase Auth means RLS can authenticate the user via the JWT *for free*, with no glue code. Switching to Better Auth would require manually wiring `auth.uid()` into RLS policies. **Roadmap flag: re-evaluate at v2 if RBAC/orgs become important — Better Auth is the natural migration target.** |
| **OpenAI `text-embedding-3-small`** | **Voyage 3.5-lite** ($0.02/1M, 32K context, higher MTEB) | Long-document chunks; cost-conscious production RAG; quality-leading retrieval | Voyage is genuinely better on retrieval benchmarks (Voyage 4 Large beats OpenAI 3-large by ~14% NDCG@10). For 90-second-clip-sized chunks, OpenAI's 8K context is *more than sufficient* and the integration ecosystem (LangChain, ai SDK, every example online) is denser. **Stay with OpenAI for MVP. Document Voyage as a swap target — abstract embeddings behind a single function.** |
| **shadcn/ui** | **Park UI**, **daisyUI**, **Tremor Raw** | Park UI: multi-framework future. daisyUI: zero-dep utility components. Tremor: dashboard-heavy admin | **Stay with shadcn/ui.** Largest ecosystem, copy-paste means OSS forkers can rip out anything they dislike, accessibility via Radix. **Tremor Raw is worth a look specifically for the admin curation UI** if data-table/charts get heavy — but ship MVP with shadcn-only. |
| **Inngest** | **Trigger.dev** (Apache 2.0, simpler API) | OSS-purist self-host story; simpler durable jobs | **Inngest is fine but Trigger.dev is more OSS-friendly out of the gate.** Inngest's open-source license is "delayed open source" (SSPL → Apache 2.0 after 3 years), which gives some OSS-purists pause; Trigger.dev is straight Apache 2.0. For Hdiary's MVP though, **start with Supabase pg_cron** (zero new dep, already in the stack) for the only background work that matters in v1 (digest emails, streak rollups). Add Inngest *or* Trigger.dev only when the v0.5 extraction pipeline lands and durable workflows actually matter. |
| **Astro Starlight** (`PROJECT.md` working assumption) | **Fumadocs** (Next.js-native), **Nextra v4** | Fumadocs: stay in the Next.js ecosystem, share components with the app. Nextra: established Next.js docs SSG. | **Switch to Fumadocs.** Astro Starlight is faster for huge docs, but Hdiary's docs site is small (quickstart, self-host, clip-curation guide, architecture). Staying in Next.js means: same toolchain, same shadcn components, same deploy target, same MDX pipeline — material time savings for a solo dev. **Drift from artifact recommendation; revisit if docs balloon to 500+ pages.** |
| **Vercel** (hosting, frontend) | **Cloudflare Pages**, self-host on Hetzner | CF Pages: cheaper at scale; Hetzner: full control | **Stay with Vercel for the hosted demo.** Free tier handles the demo; preview-deploy-per-PR is a contributor-experience win that's hard to replicate. Self-host instructions point at Docker compose. |
| **Cloudflare R2** | **Backblaze B2**, **MinIO** (self-host) | B2 cheaper egress; MinIO for compose stack | **R2 for hosted; MinIO in compose for self-host.** Abstract behind an S3-compatible client. *Deferred until v0.5 extraction lands — no object storage need at MVP.* |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Next.js 15 (Pages Router)** | App Router is the canonical 2026 model; Pages Router is in maintenance mode. | Next.js 16 App Router. |
| **CRA / Vite-only SPA** | No SSR for the public habit pages, which are the SEO-and-pitch-leverage surface. | Next.js 16 with mixed SSR/SSG. |
| **Prisma with pgvector** | Requires `Unsupported("vector")` + raw SQL queries for cosine search; loses type safety on the most important query in the app. | Drizzle with `pgvector` types. |
| **Pinecone / Weaviate / Qdrant** as a managed service | Adds a second datastore + vendor + sync layer for an MVP that has <10K vectors. Self-host story collapses. | pgvector in Postgres — same DB as everything else. |
| **TypeORM, Sequelize, Knex (raw)** | Outdated DX, type-safety holes, weak Postgres-feature support relative to Drizzle. | Drizzle. |
| **Auth.js v5 / NextAuth** for new code | The Auth.js team merged into Better Auth in Sept 2025; it's now in security-patch-only mode. | Supabase Auth (for this project) or Better Auth (for greenfield Next.js without Supabase). |
| **Clerk / Auth0 / WorkOS** | Vendor lock-in + per-MAU pricing kills the OSS self-host story. Pricing models hostile to OSS forks. | Supabase Auth or Better Auth. |
| **Self-rolled JWT auth** | Solo dev + auth = footgun factory. Specifically: RLS policies need a trustworthy `auth.uid()`. | Supabase Auth — battle-tested, wired into RLS. |
| **MUI / Chakra / Mantine** as primary UI | All ship significant runtime CSS-in-JS overhead, opinionated theming that fights Tailwind, larger bundles. shadcn's copy-paste model is strictly better for OSS forks. | shadcn/ui + Tailwind. |
| **YouTube `<iframe>` directly** in habit cards | Each iframe ships ~500KB of YouTube player JS even before the user clicks play. With 10+ habits on a feed page, this destroys mobile performance. | `lite-youtube-embed` via `@next/third-parties/google`'s `YouTubeEmbed`. |
| **IVFFlat index** for pgvector | HNSW is the 2026 default — better recall, lower latency, can be built before data exists (so curation work doesn't need rebuild). | `CREATE INDEX … USING hnsw (embedding vector_cosine_ops)`. |
| **Server Components for the entire admin UI** | Admin curation is form-heavy and interactive (autocomplete speakers, scrub clip start/end, preview embed). RSC fights you here. | Plain client components with `react-hook-form` + Server Actions for mutations. |
| **Heavy LLM (Claude Sonnet/Opus, GPT-4-class) for every interview turn** | A 10-turn onboarding × 1000 users × Sonnet pricing is real money for an OSS project with no revenue. | Haiku 4.5 / GPT-4o-mini for routine turns; escalate to Sonnet only for the final habit-recommendation synthesis step where reasoning quality matters. |
| **Local LLM mode (Ollama) at MVP** | `PROJECT.md` correctly defers this. Ollama support in v1 splits dev time and confuses the demo. | Hosted APIs only at MVP; tag a v2 issue. |
| **GraphQL** | Adds a layer with no payoff at this scale. Next.js Server Actions + tRPC (if you want types over the wire) cover everything. | Server Actions + Route Handlers; add tRPC only if `apps/admin` and `apps/web` end up sharing many calls. |
## Stack Patterns by Variant
- All AI lives in `apps/web` server actions + route handlers — no Python worker
- Background jobs: Supabase pg_cron only (digest emails, streak rollups)
- Embeddings: generate at clip-publish time inside the Next.js admin route, store in Postgres
- `apps/worker` exists as a stub directory with a `README.md` explaining the v0.5 plan
- Promote `apps/worker` to FastAPI + faster-whisper + pyannote
- Add Inngest *or* Trigger.dev for durable workflow orchestration (transcribe → diarize → claim-extract → admin review)
- Add Cloudflare R2 (hosted) or MinIO (self-host) for transcript caching
- Worker runs on Hetzner CX22 (~€4/mo)
- Document Postgres + pgvector + a "no-Supabase" path
- Add an auth abstraction layer so Better Auth can be slotted in
- Document SMTP env vars as alternative to Resend
## Version Compatibility Notes
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16 | React 19.x, Tailwind v4 | Turbopack default. React Compiler stable. |
| Tailwind v4 | shadcn/ui (latest CLI) | shadcn's `init` defaults to v4 for new projects. Components added incrementally; existing v3 components keep working. |
| pgvector 0.8.2 | Postgres 17.3+ | **Avoid Postgres 17.0–17.2** — linker bug with `float_to_shortest_decimal_bufn`. Supabase tracks this; just check your local Docker image. |
| Drizzle + Supabase pooled connection | Use `postgres` driver with `prepare: false` | Required for Supabase's "Transaction" pooler mode (PgBouncer). "Session" mode is fine without the flag but loses pooling benefits. |
| `@supabase/ssr` | Next.js 16 App Router | Use `createServerClient` in Server Components; `createBrowserClient` in client. The older `@supabase/auth-helpers-nextjs` is deprecated — do not use. |
| Vercel AI SDK 6.x | Next.js 16 | Streaming + tool calling; works with both OpenAI and Anthropic providers via `@ai-sdk/openai` / `@ai-sdk/anthropic`. Note: v6 introduces `UIMessage.parts` array (was `content` string in v5) and `convertToModelMessages` / `DefaultChatTransport`. |
## Confidence Assessment
| Decision | Confidence | Source basis |
|----------|------------|--------------|
| Next.js 16 + React 19 + Tailwind v4 | **HIGH** | Official release notes, shadcn docs |
| Supabase + Postgres + pgvector 0.8.2 + RLS | **HIGH** | Supabase docs, pgvector GitHub releases |
| Drizzle over Prisma for this project | **HIGH** | Multiple 2026 comparison articles converge; pgvector + RLS use case decisive |
| Supabase Auth for MVP (over Better Auth) | **MEDIUM-HIGH** | Better Auth is the broader 2026 trend, but Supabase Auth's RLS integration is the deciding factor for *this* project |
| OpenAI `text-embedding-3-small` for MVP | **HIGH** | Cost + integration; Voyage flagged as documented swap target |
| Claude Sonnet (extraction) + Haiku/GPT-4o-mini (chat) | **MEDIUM** | Pricing & capability tiers shift quarterly; cost ratios are correct *now* — abstract LLM provider behind a single interface |
| `lite-youtube-embed` via `@next/third-parties` | **HIGH** | Next.js official guidance; documented bundle savings |
| Background jobs: Supabase pg_cron at MVP, defer Inngest/Trigger | **HIGH** | Smallest dep surface for the only v1 background needs |
| Fumadocs over Astro Starlight | **MEDIUM** | Reasonable tradeoff; Starlight remains valid; depends on docs scope |
| shadcn/ui | **HIGH** | Active maintenance confirmed; Tailwind v4 support landed |
| pnpm + Turborepo | **HIGH** | De-facto monorepo standard for TS in 2026 |
## Drift From Artifact Recommendation — Summary Table
| Topic | Artifact said | This research says | Severity |
|-------|---------------|---------------------|----------|
| Next.js version | 15 | **16** | Bump — minor effort, free wins |
| Tailwind version | (unspecified) | **v4 from day 1** | Pin explicitly |
| YouTube embed | YouTube IFrame Player API | **Lite-embed via `@next/third-parties` `<YouTubeEmbed>`** | Adopt from day 1; meaningful perf win |
| Auth | Supabase Auth | **Supabase Auth (with Better Auth as documented v2 target)** | Same MVP choice, new awareness of ecosystem shift |
| Background jobs | Inngest free tier or pg_cron | **pg_cron at MVP; defer Inngest/Trigger.dev to v0.5** | Smaller MVP surface |
| Docs site | Astro Starlight | **Fumadocs** | Stay in Next.js ecosystem |
| Linter | (unspecified, ESLint implied) | **Biome** | Faster, single binary |
| Drizzle vs Prisma | Drizzle | **Drizzle confirmed** | No change |
| Embeddings | `text-embedding-3-small` | **Confirmed; abstract for Voyage swap later** | No change |
| LLM tiers | Sonnet/Haiku/GPT-4o-mini | **Confirmed; abstract behind provider interface** | No change |
| Monorepo | pnpm + Turborepo | **Confirmed** | No change |
| Hosting | Vercel + Supabase + Hetzner | **Confirmed** | No change |
## Sources
- [Next.js 16 release announcement](https://nextjs.org/blog/next-16) — verified Next.js 16 stable, Turbopack default, React Compiler 1.0
- [Next.js Upgrading: Version 16 docs](https://nextjs.org/docs/app/guides/upgrading/version-16) — App Router status, breaking changes
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — confirmed v4 + React 19 support, data-slot pattern
- [pgvector GitHub releases](https://github.com/pgvector/pgvector) — verified 0.8.2 current, HNSW iterative scans, Postgres 17.3+ requirement
- [Supabase pgvector docs](https://supabase.com/docs/guides/database/extensions/pgvector) — confirmed managed availability, HNSW recommendation
- [Supabase Drizzle integration docs](https://supabase.com/docs/guides/database/drizzle) — confirmed first-class support, `prepare: false` requirement
- [Better Auth migration guide / NextAuth merger announcement](https://better-auth.com/docs/guides/next-auth-migration-guide) — confirmed Sept 2025 team merger, Auth.js in security-patch-only mode
- [Inngest self-hosting announcement (1.0)](https://www.inngest.com/blog/inngest-1-0-announcing-self-hosting-support) — verified self-host story, SSPL→Apache 2.0 (DOSP) license
- [Trigger.dev OSS comparison](https://www.buildmvpfast.com/alternatives/inngest) — Apache 2.0 confirmed, simpler API
- [Drizzle vs Prisma 2026 comparison (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) — Postgres-feature support, edge bundle size
- [Drizzle vs Prisma 2026 comparison (Makerkit)](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Supabase-specific guidance
- [Embedding models comparison 2026](https://appscale.blog/en/blog/embedding-models-comparison-2026-openai-cohere-voyage-bge) — pricing, MTEB, context windows
- [text-embedding-3-small developer guide](https://tokenmix.ai/blog/text-embedding-3-small-developer-guide-2026) — verified $0.02/1M, 1536 dims, 8191 tokens
- [Next.js third-party YouTubeEmbed docs](https://nextjs.org/docs/app/guides/third-party-libraries) — verified lite-embed under the hood
- [Fumadocs vs Nextra v4 vs Starlight 2026](https://www.pkgpulse.com/blog/fumadocs-vs-nextra-v4-vs-starlight-documentation-sites-2026) — adoption trends, ecosystem fit
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

### UI Design System

All frontend plans MUST read `.planning/UI-DESIGN.md` before specifying components, colors, or typography. It is the source of truth for:
- **Color tokens** — warm paper + sage palette (Tailwind v4 `@theme`). Warm only at MVP; cool/dark deferred.
- **Typography** — Newsreader (headings + card rationale + italic accents), Geist Sans (UI body + buttons), Geist Mono (timestamps + labels). Load via `next/font/google`.
- **Habit card modes** — `hero` (200px player), `inline` (140px player), `collapsed` (single-row drawer).
- **Player rule** — marketing landing page: custom animated waveform (no YouTube iframe). Authenticated product: `<YouTubeEmbed>` from `@next/third-parties/google`.
- **Landing page** — planned for Phase 4. Full section specs in `UI-DESIGN.md`.

Do not invent new color values, font families, or spacing scales — derive everything from tokens in `UI-DESIGN.md`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
