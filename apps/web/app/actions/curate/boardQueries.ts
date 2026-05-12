'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { createDb, sql } from '@cited/db';

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

export type BoardColumn = 'inbox' | 'drafting' | 'review' | 'published';

const PREDICATES: Record<BoardColumn, string> = {
  inbox:
    "c.status='pending' AND (c.rationale IS NULL OR c.rationale = '') AND cardinality(c.risk_flags) = 0",
  drafting:
    "c.status='pending' AND (c.rationale IS NOT NULL AND c.rationale <> '') AND cardinality(c.risk_flags) = 0",
  review: "c.status='pending' AND cardinality(c.risk_flags) > 0",
  published: "c.status='approved' AND c.removed_at IS NULL",
};

export async function getBoardColumn(col: BoardColumn) {
  const user = await getSessionUser();
  if (!user || !(['curator', 'admin'] as const).includes(user.role as 'curator' | 'admin')) {
    throw new Error('forbidden');
  }

  const rows = await db().execute(
    sql.raw(`
    SELECT c.*, e.published_at,
      (SELECT 30 - COUNT(*) FROM clips c2
        WHERE c2.status='approved' AND c2.domain = c.domain AND c2.removed_at IS NULL) AS coverage_gap
    FROM clips c JOIN episodes e ON e.id = c.episode_id
    WHERE ${PREDICATES[col]}
    ORDER BY e.published_at DESC NULLS LAST, coverage_gap DESC, c.created_at DESC
    LIMIT 50
  `),
  );

  return rows;
}
