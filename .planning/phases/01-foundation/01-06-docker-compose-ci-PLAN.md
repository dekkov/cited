---
phase: 01-foundation
plan: 06
type: execute
wave: 2
depends_on: [01-01-monorepo-bootstrap-PLAN.md, 01-04-database-schema-rls-PLAN.md]
files_modified:
  - docker-compose.yml
  - docker/postgres/Dockerfile
  - docker/postgres/init.sql
  - docker/web/Dockerfile
  - docker/.env.example
  - scripts/dev-up.sh
  - scripts/dev-down.sh
  - scripts/db-migrate.sh
  - .github/workflows/ci.yml
  - docs/self-host.md
autonomous: true
requirements: [FND-03, FND-04]
must_haves:
  truths:
    - "`docker compose up` from a clean checkout boots Postgres 17.3+ with pgvector 0.8.2 + Supabase Auth + the web app"
    - "Drizzle migrations apply against the compose Postgres on startup"
    - "A CI job in .github/workflows/ci.yml runs `docker compose up -d`, applies migrations, runs RLS + cascade tests, and tears down — green on a clean checkout"
    - "A self-host doc points at the compose stack and includes the Referer-Policy guidance from LGL-07"
  artifacts:
    - path: "docker-compose.yml"
      provides: "Service definitions for db (postgres+pgvector), supabase-auth (gotrue), web"
      contains: "pgvector/pgvector"
    - path: "docker/postgres/Dockerfile"
      provides: "Postgres 17 + pgvector image — pinned versions"
      contains: "pgvector/pgvector:0.8.2-pg17"
    - path: "docker/postgres/init.sql"
      provides: "Auth schema + roles bootstrap so Supabase Auth has somewhere to write"
      contains: "create schema if not exists auth"
    - path: ".github/workflows/ci.yml"
      provides: "compose-smoke job in addition to verify + gitleaks from 01-01"
      contains: "compose-smoke"
    - path: "docs/self-host.md"
      provides: "Self-host quickstart referencing the compose stack"
      contains: "docker compose up"
  key_links:
    - from: "docker-compose.yml"
      to: "packages/db/migrations"
      via: "scripts/db-migrate.sh runs drizzle-kit migrate against the compose db"
      pattern: "drizzle-kit migrate"
    - from: ".github/workflows/ci.yml"
      to: "docker-compose.yml"
      via: "CI job `compose-smoke` invokes `docker compose up -d` and `pnpm --filter @cited/db test`"
      pattern: "docker compose"
---

<objective>
Provide the `docker compose up` self-host path mandated by FND-03 and the CI smoke test mandated by FND-04. The stack runs Postgres 17.3+ with pgvector 0.8.2, the GoTrue Supabase Auth service, and the Next.js web app from `apps/web`. CI runs the same compose stack on every PR, applies migrations, and runs the RLS + cascade tests from plan 01-04.

Purpose: Phase 1 success criterion #1 (`docker compose up` boots same stack; CI verifies on every PR). Mitigates Pitfall 9 (phantom worker / unverified self-host claim).
Output: A reproducible local + CI compose stack, plus a self-host doc.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-01-SUMMARY.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-04-SUMMARY.md
@/home/king/Hdiary/docs/legal/self-host-referer-policy.md

# Locked from CLAUDE.md:
# - Postgres 17.3+ (avoid 17.0–17.2 due to pgvector linker bug)
# - pgvector 0.8.2
# - Supabase Auth (GoTrue) bundled
# - Image: pgvector/pgvector:pg17
</context>

<tasks>

<task type="auto">
  <name>Task 1: docker-compose.yml + Postgres+pgvector + GoTrue auth + web service</name>
  <files>docker-compose.yml, docker/postgres/Dockerfile, docker/postgres/init.sql, docker/web/Dockerfile, docker/.env.example, scripts/dev-up.sh, scripts/dev-down.sh, scripts/db-migrate.sh</files>
  <read_first>/home/king/Hdiary/CLAUDE.md (Self-Host Friction Budget table), /home/king/Hdiary/packages/db/drizzle.config.ts</read_first>
  <action>
1. `docker/postgres/Dockerfile`:
   ```dockerfile
   # Pinned: pgvector 0.8.0 on Postgres 17.4 per CLAUDE.md
   # (CLAUDE.md forbids Postgres 17.0–17.2 due to pgvector linker bug.
   #  The floating `pg17` tag may resolve to a forbidden minor; pin the exact tag.)
   FROM pgvector/pgvector:0.8.2-pg17
   COPY init.sql /docker-entrypoint-initdb.d/00_init.sql
   ```

2. `docker/postgres/init.sql` — minimum bootstrap so GoTrue can write its tables:
   ```sql
   create schema if not exists auth;
   create role anon nologin;
   create role authenticated nologin;
   create role service_role nologin bypassrls;
   create role authenticator noinherit login password 'authenticator';
   grant anon, authenticated, service_role to authenticator;
   -- GoTrue connects as supabase_auth_admin (see GOTRUE_DB_DATABASE_URL in docker-compose.yml).
   -- Without this role GoTrue fails to start ("role does not exist").
   create role supabase_auth_admin login password 'postgres';
   grant all on schema auth to supabase_auth_admin;
   grant connect on database postgres to supabase_auth_admin;
   alter database postgres set search_path to public, extensions;
   create extension if not exists vector;
   create extension if not exists pgcrypto;
   create extension if not exists pg_trgm;
   ```

3. `docker/web/Dockerfile`:
   ```dockerfile
   FROM node:20.11-alpine AS base
   RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
   WORKDIR /app

   FROM base AS deps
   COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
   COPY apps/web/package.json apps/web/
   COPY packages/db/package.json packages/db/
   COPY packages/core/package.json packages/core/
   COPY packages/ui/package.json packages/ui/
   COPY packages/config/package.json packages/config/
   COPY packages/api-contracts/package.json packages/api-contracts/
   RUN pnpm install --frozen-lockfile

   FROM base AS build
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN pnpm --filter @cited/web build

   FROM base AS run
   ENV NODE_ENV=production
   COPY --from=build /app /app
   EXPOSE 3000
   CMD ["pnpm","--filter","@cited/web","start"]
   ```

4. `docker-compose.yml`:
   ```yaml
   name: cited
   services:
     db:
       build: ./docker/postgres
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: postgres
       ports: ["54322:5432"]
       volumes: [db-data:/var/lib/postgresql/data]
       healthcheck:
         test: ["CMD-SHELL","pg_isready -U postgres"]
         interval: 5s
         timeout: 5s
         retries: 10

     auth:
       image: supabase/gotrue:v2.158.1
       depends_on:
         db: { condition: service_healthy }
       environment:
         GOTRUE_API_HOST: 0.0.0.0
         GOTRUE_API_PORT: 9999
         GOTRUE_DB_DRIVER: postgres
         GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:postgres@db:5432/postgres
         GOTRUE_SITE_URL: http://localhost:3000
         GOTRUE_JWT_SECRET: ${GOTRUE_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
         GOTRUE_JWT_EXP: "3600"
         GOTRUE_DISABLE_SIGNUP: "false"
         GOTRUE_MAILER_AUTOCONFIRM: "true"
         GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
         GOTRUE_EXTERNAL_GOOGLE_ENABLED: "false"
       ports: ["9999:9999"]

     web:
       build:
         context: .
         dockerfile: docker/web/Dockerfile
       depends_on:
         db: { condition: service_healthy }
         auth: { condition: service_started }
       environment:
         NEXT_PUBLIC_SUPABASE_URL: http://localhost:9999
         NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-eyJ...}
         SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-eyJ...}
         DATABASE_URL: postgres://postgres:postgres@db:5432/postgres
         NODE_ENV: production
       ports: ["3000:3000"]

   volumes:
     db-data: {}
   ```

5. `docker/.env.example`:
   ```
   GOTRUE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters
   SUPABASE_ANON_KEY=replace-with-locally-generated-jwt
   SUPABASE_SERVICE_ROLE_KEY=replace-with-locally-generated-jwt
   ```
   With a comment block explaining how to generate the JWTs (signed with GOTRUE_JWT_SECRET, role: anon | service_role) — link to https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys.

6. `scripts/dev-up.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   cd "$(dirname "$0")/.."
   if [ ! -f docker/.env ]; then cp docker/.env.example docker/.env; echo "Created docker/.env — generate JWTs before running again."; exit 0; fi
   docker compose --env-file docker/.env up -d --wait
   ./scripts/db-migrate.sh
   echo "Stack ready: web http://localhost:3000  auth http://localhost:9999  db postgres://localhost:54322"
   ```

7. `scripts/dev-down.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   cd "$(dirname "$0")/.."
   docker compose down "$@"
   ```

8. `scripts/db-migrate.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   cd "$(dirname "$0")/.."
   export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:54322/postgres}"
   pnpm --filter @cited/db migrate
   # Apply hand-written SQL files (drizzle-kit handles 0000_init.sql; the RLS files need direct apply)
   for f in packages/db/migrations/0001_extensions_and_rls.sql packages/db/migrations/0002_rls_policies.sql; do
     echo "Applying $f"
     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```

9. Make scripts executable (`chmod +x scripts/*.sh`).

10. Add to root `package.json` scripts:
    - `"dev:stack": "./scripts/dev-up.sh"`
    - `"dev:stack:down": "./scripts/dev-down.sh"`
    - `"db:migrate": "./scripts/db-migrate.sh"`
  </action>
  <acceptance_criteria>
- `test -f docker-compose.yml && grep -q "pgvector/pgvector:0.8.2-pg17" docker/postgres/Dockerfile` (W-07: exact tag, no floating `pg17`)
- `grep -q "supabase/gotrue" docker-compose.yml`
- `grep -q "create extension if not exists vector" docker/postgres/init.sql`
- `grep -q "create role authenticator" docker/postgres/init.sql`
- `grep -q "supabase_auth_admin" docker/postgres/init.sql` (B-01: GoTrue connects as this role; missing it breaks `auth` service startup)
- `test -x scripts/dev-up.sh && test -x scripts/db-migrate.sh && test -x scripts/dev-down.sh`
- `docker compose config -q` exits 0 (yaml is valid)
- After `./scripts/dev-up.sh` (with .env JWTs filled): `pg_isready -h localhost -p 54322` exits 0
- After migrate: `psql postgres://postgres:postgres@localhost:54322/postgres -c "select count(*) from pg_extension where extname='vector'"` returns 1
- After migrate: `psql ... -c "select count(*) from pg_policies where schemaname='public'"` returns ≥20
  </acceptance_criteria>
  <done>Compose stack boots locally; migrations apply; pgvector + RLS policies present.</done>
</task>

<task type="auto">
  <name>Task 2: Add compose-smoke CI job to .github/workflows/ci.yml + run RLS+cascade tests against it</name>
  <files>.github/workflows/ci.yml</files>
  <read_first>.github/workflows/ci.yml (after 01-01 Task 3), packages/db/test/rls.test.ts, packages/db/test/cascade.test.ts</read_first>
  <action>
Append a new job `compose-smoke` to `.github/workflows/ci.yml` (added in 01-01 Task 3 with `verify` + `gitleaks`):

```yaml
  compose-smoke:
    runs-on: ubuntu-latest
    needs: verify
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Generate Supabase JWT secrets
        run: |
          # Deterministic CI JWTs signed with the same secret GoTrue uses.
          # `jsonwebtoken` is in root devDependencies (plan 01-01 Task 1) — no install fallback needed under --frozen-lockfile.
          echo "GOTRUE_JWT_SECRET=ci-test-secret-with-at-least-32-characters-long" > docker/.env
          node -e "
            const jwt = require('jsonwebtoken');
            const secret = 'ci-test-secret-with-at-least-32-characters-long';
            const exp = Math.floor(Date.now()/1000) + 60*60*24*365;
            const anon = jwt.sign({role:'anon',iss:'supabase',exp}, secret);
            const sr = jwt.sign({role:'service_role',iss:'supabase',exp}, secret);
            const fs = require('fs');
            fs.appendFileSync('docker/.env', '\nSUPABASE_ANON_KEY=' + anon + '\nSUPABASE_SERVICE_ROLE_KEY=' + sr + '\n');
          "

      - name: Boot compose stack
        run: docker compose --env-file docker/.env up -d --wait

      - name: Apply migrations
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:54322/postgres
        run: ./scripts/db-migrate.sh

      - name: Run RLS + cascade tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:54322/postgres
          SUPABASE_URL: http://localhost:9999
        run: |
          # IMPORTANT: do NOT use a job-level `env:` block to inject SUPABASE_ANON_KEY /
          # SUPABASE_SERVICE_ROLE_KEY from `${{ env.X }}` — those expressions evaluate at
          # YAML-parse time and the keys do not exist until docker/.env is written above.
          # Instead, source docker/.env at runtime so the freshly-minted JWTs reach the test process.
          set -a; . docker/.env; set +a
          pnpm --filter @cited/db test

      - name: Curl the web service
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3000 > /dev/null; then echo "web up"; exit 0; fi
            sleep 2
          done
          echo "web did not become ready"; docker compose logs web; exit 1

      - name: Tear down
        if: always()
        run: docker compose down -v
```

Note: `jsonwebtoken` is already in root devDependencies (added in plan 01-01 Task 1). Do NOT add a `|| pnpm add -w -D jsonwebtoken` fallback — it breaks under `--frozen-lockfile` in CI.
  </action>
  <acceptance_criteria>
- `grep -q "compose-smoke:" .github/workflows/ci.yml`
- `grep -q "docker compose --env-file docker/.env up -d --wait" .github/workflows/ci.yml`
- `grep -q "pnpm --filter @cited/db test" .github/workflows/ci.yml`
- `grep -q "curl -sf http://localhost:3000" .github/workflows/ci.yml`
- `grep -q "docker compose down -v" .github/workflows/ci.yml`
- `needs: verify` ensures compose-smoke runs after the cheap checks
- On a real PR push, this job runs to completion green
  </acceptance_criteria>
  <done>CI compose-smoke job: builds the stack, applies migrations, runs RLS + cascade tests, curls the web service, tears down.</done>
</task>

<task type="auto">
  <name>Task 3: docs/self-host.md with Referer-Policy guidance</name>
  <files>docs/self-host.md</files>
  <read_first>docker-compose.yml, docs/legal/self-host-referer-policy.md</read_first>
  <action>
1. `docs/self-host.md`:
   ```markdown
   # Self-host Cited

   > Status: Phase 1 stack — auth + schema + skeleton web app.
   > Curation tooling (Phase 2) and the user AI loop (Phase 3) ship over the same compose stack.

   ## Requirements
   - Docker 24+
   - 4 GB RAM free
   - Ports 3000, 9999, 54322 free

   ## Quickstart (10 commands)
   ```bash
   git clone <repo> cited && cd cited
   cp docker/.env.example docker/.env
   # Edit docker/.env — set GOTRUE_JWT_SECRET, then generate anon + service_role JWTs signed with that secret
   ./scripts/dev-up.sh
   open http://localhost:3000
   ```

   ## Generating Supabase JWTs locally
   See https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

   ## YouTube embed Referer-Policy
   See [docs/legal/self-host-referer-policy.md](./legal/self-host-referer-policy.md).

   tl;dr: keep `Referrer-Policy: strict-origin-when-cross-origin` (Next.js default). Do **not** set `no-referrer` — YouTube will refuse to play.

   ## Schema migrations
   `pnpm db:migrate` (applies Drizzle migrations + the hand-written RLS SQL files).

   ## Production self-host
   The Phase 1 compose stack is wired for development. Production self-host (TLS, backups, monitoring) lands in Phase 4 — until then, use the hosted demo at <demo-domain>.

   ## Troubleshooting
   - **`vector` extension missing**: ensure your image is `pgvector/pgvector:0.8.2-pg17` not stock postgres.
   - **GoTrue can't connect to db**: the `auth` service depends on `db` health-check; if it fails, run `docker compose logs db`.
   - **YouTube embed black box**: see Referer-Policy doc above.
   ```
  </action>
  <acceptance_criteria>
- `test -f docs/self-host.md && grep -q "docker compose" docs/self-host.md`
- `grep -q "Referrer-Policy" docs/self-host.md && grep -q "self-host-referer-policy.md" docs/self-host.md`
- `grep -q "pgvector/pgvector:0.8.2-pg17" docs/self-host.md`
- `grep -qi "10 commands" docs/self-host.md`
  </acceptance_criteria>
  <done>Self-host doc lands with quickstart + Referer-Policy guidance + troubleshooting.</done>
</task>

</tasks>

<verification>
1. `docker compose config -q` valid
2. `./scripts/dev-up.sh` from clean checkout: db + auth + web all healthy in <60s
3. `psql postgres://postgres:postgres@localhost:54322/postgres -c "\\d+ public.clips"` shows vector(1536) embedding
4. `psql ... -c "select count(*) from pg_policies where schemaname='public'"` ≥20
5. `curl -s http://localhost:3000` returns the landing page
6. CI: push a PR; compose-smoke job goes green
7. `./scripts/dev-down.sh` cleans up
</verification>

<success_criteria>
- 2 requirements satisfied (FND-03, FND-04)
- `docker compose up` boots the same stack on dev and CI
- RLS + cascade tests run green against a real Supabase Auth + Postgres
- Self-host doc with Referer-Policy guidance lands
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-06-SUMMARY.md` documenting:
- Final image versions (pgvector/pgvector:pg17.x, supabase/gotrue:vX.Y.Z)
- The local URL map (web 3000, auth 9999, db 54322)
- CI smoke timing observed
- Known gaps deferred to Phase 4 (TLS, backups, full Supabase Studio integration)
</output>
