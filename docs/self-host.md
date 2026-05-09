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

You need two JWTs signed with your `GOTRUE_JWT_SECRET`:

| Key | Payload |
|-----|---------|
| `SUPABASE_ANON_KEY` | `{ "role": "anon", "iss": "supabase" }` |
| `SUPABASE_SERVICE_ROLE_KEY` | `{ "role": "service_role", "iss": "supabase" }` |

Use HS256 algorithm. Set them in `docker/.env`.

## YouTube embed Referer-Policy

See [docs/legal/self-host-referer-policy.md](./legal/self-host-referer-policy.md).

tl;dr: keep `Referrer-Policy: strict-origin-when-cross-origin` (Next.js default). Do **not** set `no-referrer` — YouTube will refuse to play.

## Schema migrations

```bash
pnpm db:migrate
```

This applies Drizzle migrations (`packages/db/migrations/`) and the hand-written RLS SQL files against the compose database.

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| web | http://localhost:3000 | Next.js web app |
| auth | http://localhost:9999 | Supabase GoTrue auth API |
| db | postgres://localhost:54322 | Postgres 17 + pgvector 0.8.2 |

## Postgres image

The compose stack uses `pgvector/pgvector:0.8.2-pg17` — do not substitute with stock `postgres:17` as it does not include the `vector` extension.

## Stopping the stack

```bash
./scripts/dev-down.sh         # stop and keep data
./scripts/dev-down.sh -v      # stop and remove volumes (fresh start)
```

## Production self-host

The Phase 1 compose stack is wired for development. Production self-host (TLS, backups, monitoring) lands in Phase 4 — until then, use the hosted demo at `<demo-domain>`.

## Troubleshooting

- **`vector` extension missing**: ensure your image is `pgvector/pgvector:0.8.2-pg17` not stock postgres.
- **GoTrue can't connect to db**: the `auth` service depends on `db` health-check; if it fails, run `docker compose logs db`.
- **YouTube embed black box**: see Referer-Policy doc above — check your reverse proxy is not stripping the `Referer` header.
- **`docker/.env` not found**: run `./scripts/dev-up.sh` once; it will create `docker/.env` from `docker/.env.example` and exit, prompting you to fill in the JWTs.
