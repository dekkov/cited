'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { podcasts } from '@cited/db';
import { type AddPodcastInput, addPodcastSchema } from './schemas';

// Singleton DB connection — reused across requests in the same process.
function db() {
  return getDb();
}

export type AddedPodcast = {
  id: string;
  name: string;
  host: string | null;
  trustTier: number | null;
};

/**
 * ADMN-16 — Inline "add new source" used by the transcript ingestion form when the curator
 * encounters a non-DOAC podcast. Curator/admin only (RLS would also block; checked here for
 * an explicit 401-style error before SQL runs).
 */
export async function addPodcast(input: AddPodcastInput): Promise<AddedPodcast> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = addPodcastSchema.parse(input);
  const [row] = await db()
    .insert(podcasts)
    .values({
      name: parsed.name,
      host: parsed.host ?? null,
      trustTier: parsed.trustTier,
    })
    .returning({
      id: podcasts.id,
      name: podcasts.name,
      host: podcasts.host,
      trustTier: podcasts.trustTier,
    });
  if (!row) throw new Error('addPodcast: insert returned no rows');
  return row;
}
