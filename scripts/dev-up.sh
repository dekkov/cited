#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f docker/.env ]; then
  cp docker/.env.example docker/.env
  echo "Created docker/.env — edit GOTRUE_JWT_SECRET and generate JWTs before running again."
  echo "See: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys"
  exit 0
fi

docker compose --env-file docker/.env up -d --wait
./scripts/db-migrate.sh
echo ""
echo "Stack ready:"
echo "  web   http://localhost:3000"
echo "  auth  http://localhost:9999"
echo "  db    postgres://localhost:54322"
