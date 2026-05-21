import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

interface DbOptions {
  /** postgres.js pool max connections (default: 10). Lower for Supabase session-mode pooler. */
  max?: number;
}

export function createDb(url: string, options?: DbOptions) {
  const queryClient = postgres(url, { prepare: false, max: options?.max ?? 10 });
  return drizzle(queryClient, { schema });
}

export type Db = ReturnType<typeof createDb>;
