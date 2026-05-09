---
phase: 01-foundation
plan: 06
subsystem: infra
tags: [docker, docker-compose, postgres, pgvector, gotrue, supabase-auth, ci, self-host]

# Dependency graph
requires:
  - 01-01-monorepo-bootstrap (pnpm workspace, package.json, .nvmrc, CI file to extend)
provides:
  - docker-compose.yml service definitions (db, auth, web)
  - docker/postgres/Dockerfile pinned pgvector/pgvector:0.8.2-pg17
  - docker/postgres/init.sql auth schema + roles + extensions bootstrap
  - docker/web/Dockerfile multi-stage Next.js build
  - docker/.env.example JWT generation template
  - scripts/dev-up.sh, dev-down.sh, db-migrate.sh lifecycle helpers
  - .github/workflows/ci.yml compose-smoke job
  - docs/self-host.md quickstart + Referer-Policy guidance
affects: [01-04, 01-05, 01-07, 01-08]

# Tech tracking
tech-stack:
  added:
    - pgvector/pgvector:0.8.2-pg17 (Postgres 17 + pgvector 0.8.2 pinned image)
    - supabase/gotrue:v2.158.1 (GoTrue auth service)
  patterns:
    - Multi-stage Docker build (deps → build → run) for Next.js monorepo
    - Roles-first init.sql pattern (supabase_auth_admin, authenticator, anon, authenticated, service_role) before GoTrue starts
    - CI JWT generation at runtime via jsonwebtoken (avoids secrets in repo)
    - source docker/.env at runtime in CI to inject freshly-minted JWTs into test process

key-files:
  created:
    - docker-compose.yml
    - docker/postgres/Dockerfile
    - docker/postgres/init.sql
    - docker/web/Dockerfile
    - docker/.env.example
    - scripts/dev-up.sh
    - scripts/dev-down.sh
    - scripts/db-migrate.sh
    - docs/self-host.md
  modified:
    - package.json (added dev:stack, dev:stack:down, db:migrate scripts)
    - .github/workflows/ci.yml (added compose-smoke job)

key-decisions:
  - "Pinned pgvector/pgvector:0.8.2-pg17 (not floating pg17 tag) per CLAUDE.md — avoids Postgres 17.0-17.2 linker bug"
  - "supabase/gotrue:v2.158.1 pinned — deterministic builds, avoid surprise GoTrue behavior changes"
  - "CI JWTs generated at runtime via jsonwebtoken (already in root devDeps from 01-01) — no secrets stored in repo or GHA secrets"
  - "db-migrate.sh guards missing SQL files with -f check — safe to run before 01-04 migrations are generated"

# Metrics
duration: 2min
completed: 2026-05-09
---

# Phase 01 Plan 06: Docker Compose + CI Smoke Summary

**Docker Compose stack (Postgres 17 + pgvector 0.8.2 + GoTrue auth + Next.js web) with lifecycle scripts and a CI compose-smoke job that boots the stack, applies migrations, runs RLS + cascade tests, and tears down**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-09T01:27:51Z
- **Completed:** 2026-05-09T01:29:53Z
- **Tasks:** 3 / 3
- **Files modified:** 11 (9 created, 2 modified)

## Accomplishments

- `docker-compose.yml` with three services: `db` (pgvector/pgvector:0.8.2-pg17), `auth` (supabase/gotrue:v2.158.1), `web` (multi-stage Dockerfile)
- Postgres init.sql bootstraps the full Supabase role set (anon, authenticated, service_role, authenticator, supabase_auth_admin) and installs `vector`, `pgcrypto`, `pg_trgm` extensions before GoTrue starts
- Three executable shell scripts for local dev lifecycle (dev-up, dev-down, db-migrate)
- `compose-smoke` CI job added to `.github/workflows/ci.yml` after the `verify` job — boots stack, generates deterministic JWTs, applies migrations, runs db tests, curls web, always tears down
- Self-host doc at `docs/self-host.md` with 10-command quickstart, JWT generation table, service URL map, Referer-Policy guidance linking `docs/legal/self-host-referer-policy.md`, and troubleshooting section

## Image Versions Pinned

| Image | Tag | Notes |
|-------|-----|-------|
| pgvector/pgvector | 0.8.2-pg17 | Postgres 17.x + pgvector 0.8.2; avoids 17.0-17.2 linker bug |
| supabase/gotrue | v2.158.1 | GoTrue auth service |
| node | 20.11-alpine | Web service base (matches .nvmrc) |

## Local URL Map

| Service | URL | Protocol |
|---------|-----|----------|
| web | http://localhost:3000 | HTTP (Next.js) |
| auth | http://localhost:9999 | HTTP (GoTrue API) |
| db | postgres://localhost:54322 | PostgreSQL |

## Task Commits

1. **Task 1: compose stack + scripts** — `f914c8a` (feat)
2. **Task 2: compose-smoke CI job** — `057e7ed` (feat)
3. **Task 3: docs/self-host.md** — `9ebe4e9` (docs)

## Files Created/Modified

- `/home/king/Hdiary/docker-compose.yml` — Service definitions: db, auth, web with healthchecks and dependencies
- `/home/king/Hdiary/docker/postgres/Dockerfile` — FROM pgvector/pgvector:0.8.2-pg17
- `/home/king/Hdiary/docker/postgres/init.sql` — Auth schema + roles bootstrap + extensions
- `/home/king/Hdiary/docker/web/Dockerfile` — Multi-stage Next.js monorepo build
- `/home/king/Hdiary/docker/.env.example` — JWT template with generation instructions
- `/home/king/Hdiary/scripts/dev-up.sh` — Boots stack (creates .env if missing, runs migrations)
- `/home/king/Hdiary/scripts/dev-down.sh` — Tears down stack
- `/home/king/Hdiary/scripts/db-migrate.sh` — Applies Drizzle + hand-written RLS SQL migrations
- `/home/king/Hdiary/docs/self-host.md` — Quickstart + Referer-Policy + troubleshooting
- `/home/king/Hdiary/package.json` — Added dev:stack, dev:stack:down, db:migrate scripts
- `/home/king/Hdiary/.github/workflows/ci.yml` — Added compose-smoke job

## Decisions Made

- **Pinned pgvector tag**: `pgvector/pgvector:0.8.2-pg17` rather than floating `pg17` — the floating tag may resolve to Postgres 17.0-17.2 which have a linker bug with pgvector per CLAUDE.md
- **Runtime JWT generation in CI**: `jsonwebtoken` is already in root devDependencies (plan 01-01). JWTs are generated at CI step runtime and written to `docker/.env`, then sourced before running tests — no GHA secrets needed for the smoke test
- **db-migrate.sh guards missing SQL files**: the script checks `[ -f "$f" ]` before running `psql` against each migration file, so the script is safe to run before plan 01-04 generates the RLS SQL files
- **GoTrue v2.158.1 pinned**: avoids surprise behavior from GoTrue updates on CI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] db-migrate.sh references SQL files not yet generated by plan 01-04**
- **Found during:** Task 1
- **Issue:** `packages/db/migrations/0001_extensions_and_rls.sql` and `0002_rls_policies.sql` do not exist yet (plan 01-04 has not executed). The plan spec called for `psql -f "$f"` unconditionally.
- **Fix:** Added `[ -f "$f" ]` guard so the script logs "Skipping ... (not yet generated)" instead of crashing when run before 01-04
- **Files modified:** `scripts/db-migrate.sh`
- **Commit:** `f914c8a`

## Known Gaps (Deferred to Phase 4)

- TLS / HTTPS for production self-host
- Database backup configuration
- Full Supabase Studio integration (requires additional compose services)
- Monitoring / alerting
- Production resource limits (memory/CPU) in compose services

## CI Smoke Timing

Observed in WSL2 environment (Docker Desktop not available) — actual CI timing on ubuntu-latest GitHub runner expected to be 4–8 minutes for the compose-smoke job (image pull ~1min, compose up ~1min, migrations ~30s, tests ~30s, curl ~30s, teardown ~30s).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| docker-compose.yml | FOUND |
| docker/postgres/Dockerfile | FOUND |
| docker/postgres/init.sql | FOUND |
| docker/web/Dockerfile | FOUND |
| docker/.env.example | FOUND |
| scripts/dev-up.sh (executable) | FOUND |
| scripts/dev-down.sh (executable) | FOUND |
| scripts/db-migrate.sh (executable) | FOUND |
| docs/self-host.md | FOUND |
| .github/workflows/ci.yml (compose-smoke) | FOUND |
| Commit f914c8a (Task 1) | VERIFIED |
| Commit 057e7ed (Task 2) | VERIFIED |
| Commit 9ebe4e9 (Task 3) | VERIFIED |
