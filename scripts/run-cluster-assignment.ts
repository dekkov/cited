#!/usr/bin/env tsx
/**
 * Cluster assignment script — idempotent, safe to run on schedule.
 *
 * For each habit template, computes the centroid of its clips' embeddings
 * (element-wise mean), then runs k-means with k=4 per domain to assign cluster_id.
 * Writes cluster_id back to habit_templates.
 *
 * Usage:
 *   pnpm tsx scripts/run-cluster-assignment.ts
 *
 * Cron: Registered in packages/db/migrations/0010_pg_cron_cluster_assignment.sql
 * to run weekly on Sundays at 03:00 UTC via a pg_cron HTTP call.
 */

import 'dotenv/config';
import { sql, eq } from 'drizzle-orm';
import { createDb } from '../packages/db/src/client';
import { habitTemplates } from '../packages/db/src/schema/habit-templates';
import { computeClusters } from '../packages/core/src/swap/cluster';
import type { TemplateEmbedding } from '../packages/core/src/swap/cluster';

interface RawRow {
  template_id: string;
  domain: string;
  centroid: string | null; // PostgreSQL returns arrays as strings
}

function parsePgArray(raw: string | null): number[] | null {
  if (!raw) return null;
  // pg arrays look like {0.1,0.2,...} or "ARRAY[...]"
  const stripped = raw.replace(/^\{|\}$/g, '');
  if (!stripped) return null;
  const parts = stripped.split(',').map(Number);
  if (parts.some(isNaN)) return null;
  return parts;
}

export async function runClusterAssignment(): Promise<{ assigned: number }> {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL env var is required');

  const db = createDb(url, { max: 3 });

  // Fetch centroid per template: element-wise mean of all clip embeddings for that template.
  // We do this in JS to avoid complex aggregate SQL — at MVP (<100 templates) this is fine.
  const rawRows = await db.execute<RawRow>(sql`
    SELECT
      ht.id AS template_id,
      ht.domain::text AS domain,
      CASE
        WHEN COUNT(c.embedding) = 0 THEN NULL
        ELSE (
          -- Serialize as a text array for parsing in JS
          -- We return the avg embedding as a formatted array string
          array_to_string(
            ARRAY(
              SELECT round(avg(val)::numeric, 8)::text
              FROM (
                SELECT unnest(c2.embedding::float[]) WITH ORDINALITY AS t(val, ord)
                FROM habit_template_clips htc2
                JOIN clips c2 ON c2.id = htc2.clip_id
                WHERE htc2.habit_template_id = ht.id
                  AND c2.embedding IS NOT NULL
              ) sub
              GROUP BY sub.ord
              ORDER BY sub.ord
            ),
            ','
          )
        )
      END AS centroid
    FROM habit_templates ht
    LEFT JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
    LEFT JOIN clips c ON c.id = htc.clip_id AND c.embedding IS NOT NULL
    GROUP BY ht.id, ht.domain
  `);

  const rows = Array.isArray(rawRows) ? rawRows : (rawRows as { rows: RawRow[] }).rows ?? [];

  const templates: TemplateEmbedding[] = [];
  const nullTemplateIds: string[] = [];

  for (const row of rows) {
    const centroid = parsePgArray(row.centroid);
    if (!centroid || centroid.length === 0) {
      nullTemplateIds.push(row.template_id);
      continue;
    }
    templates.push({
      templateId: row.template_id,
      domain: row.domain as TemplateEmbedding['domain'],
      centroid,
    });
  }

  const assignments = computeClusters(templates, 4);

  let assigned = 0;
  for (const a of assignments) {
    await db
      .update(habitTemplates)
      .set({ clusterId: a.clusterId, updatedAt: new Date() })
      .where(eq(habitTemplates.id, a.templateId));
    assigned++;
  }

  // Set cluster_id = NULL for templates with no clips / no embeddings
  for (const id of nullTemplateIds) {
    await db
      .update(habitTemplates)
      .set({ clusterId: null, updatedAt: new Date() })
      .where(eq(habitTemplates.id, id));
  }

  console.log(`[cluster-assignment] assigned=${assigned}, null=${nullTemplateIds.length}`);
  return { assigned };
}

// Allow direct execution
const isMain = process.argv[1]?.endsWith('run-cluster-assignment.ts');
if (isMain) {
  runClusterAssignment()
    .then((r) => {
      console.log(r);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[cluster-assignment] error:', err);
      process.exit(1);
    });
}
