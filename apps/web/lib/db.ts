import 'server-only';

import { createDb } from '@cited/db';

/**
 * Singleton Drizzle client for apps/web server components, route handlers, and server actions.
 * Uses postgres driver with prepare: false (required for Supabase Transaction pooler mode).
 */
let _db: ReturnType<typeof createDb> | null = null;

export function getDb(): ReturnType<typeof createDb> {
  if (!_db) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL env var is required');
    _db = createDb(url);
  }
  return _db;
}
