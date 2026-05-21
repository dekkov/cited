import 'server-only';

import { getDb } from '@/lib/db';
import { episodes, eq, ne } from '@cited/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const THRESHOLD = 3;

// Test seam: injectable fetch implementation
export let oembedFetchImpl: (url: string) => Promise<Response> = (url) => fetch(url);
export function __setOembedFetchImpl(impl: typeof oembedFetchImpl) {
  oembedFetchImpl = impl;
}

function db() {
  return getDb();
}

export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Only check episodes that are still active (skip already flagged)
  const rows = await db()
    .select()
    .from(episodes)
    .where(ne(episodes.availability, 'removed_from_source'));

  let flagged = 0;
  let healthy = 0;
  let incremented = 0;

  for (const ep of rows) {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ep.youtubeVideoId}&format=json`;
    let status = 0;

    try {
      const res = await oembedFetchImpl(oembedUrl);
      status = res.status;
    } catch {
      // Network error treated as 404 for counter
      status = 0;
    }

    const now = new Date();

    if (status === 200) {
      await db()
        .update(episodes)
        .set({ oembed404Count: 0, lastOembedCheckAt: now, updatedAt: now })
        .where(eq(episodes.id, ep.id));
      healthy++;
    } else if (status === 404 || status === 0) {
      const newCount = (ep.oembed404Count ?? 0) + 1;
      if (newCount >= THRESHOLD) {
        await db()
          .update(episodes)
          .set({
            availability: 'removed_from_source',
            sourceUnavailableAt: now,
            oembed404Count: newCount,
            lastOembedCheckAt: now,
            updatedAt: now,
          })
          .where(eq(episodes.id, ep.id));
        flagged++;
      } else {
        await db()
          .update(episodes)
          .set({ oembed404Count: newCount, lastOembedCheckAt: now, updatedAt: now })
          .where(eq(episodes.id, ep.id));
        incremented++;
      }
    } else {
      // 2xx/3xx other than 200, or 5xx — touch lastOembedCheckAt without incrementing
      await db()
        .update(episodes)
        .set({ lastOembedCheckAt: now, updatedAt: now })
        .where(eq(episodes.id, ep.id));
    }
  }

  return NextResponse.json({ checked: rows.length, healthy, incremented, flagged });
}
