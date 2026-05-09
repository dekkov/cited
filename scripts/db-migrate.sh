#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:54322/postgres}"

pnpm --filter @cited/db migrate

# Apply hand-written SQL files.
# drizzle-kit handles 0000_init.sql; the RLS files need direct apply.
for f in packages/db/migrations/0001_extensions_and_rls.sql packages/db/migrations/0002_rls_policies.sql; do
  if [ -f "$f" ]; then
    echo "Applying $f"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
  else
    echo "Skipping $f (not yet generated — run after plan 01-04)"
  fi
done
