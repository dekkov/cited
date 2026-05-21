import 'server-only';

import { createDb } from '@cited/db';

/**
 * Singleton Drizzle client for apps/web server components, route handlers, and server actions.
 *
 * Uses globalThis so the same pool survives Next.js hot-module replacement in dev mode;
 * without this, each HMR reload creates a fresh postgres pool and Supabase's session-mode
 * pooler (max 15 connections) is exhausted within minutes of active development.
 *
 * This MUST be the only Postgres pool in apps/web. Every server component, route handler,
 * server action, and auth guard goes through getDb() — never call createDb() directly
 * elsewhere, or you spawn a second pool and exhaust the session-mode pooler (max 15 clients).
 * Pool max=10 leaves headroom under that cap for Drizzle Studio and one-off scripts that
 * run in separate processes. In prod (Vercel serverless), each invocation is its own process,
 * so globalThis resets naturally and max=10 is fine there too.
 */
type DbInstance = ReturnType<typeof createDb>;

const _global = globalThis as unknown as { _citedDb?: DbInstance };

export function getDb(): DbInstance {
  if (!_global._citedDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL env var is required');
    _global._citedDb = createDb(url, { max: 10 });
  }
  return _global._citedDb;
}
