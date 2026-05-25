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

import * as path from 'node:path';
import { config } from 'dotenv';

// Match scripts/seed-test-clips.ts: DATABASE_URL lives in apps/web/.env.local,
// not in a repo-root .env. Load it before any module that needs the env reads it.
config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

import { eq, sql } from 'drizzle-orm';
import { computeClusters } from '../packages/core/src/swap/cluster';
import type { TemplateEmbedding } from '../packages/core/src/swap/cluster';
import { createDb } from '../packages/db/src/client';
import { habitTemplates } from '../packages/db/src/schema/habit-templates';

interface RawRow {
  template_id: string;
  domain: string;
  embedding: string | null; // pgvector serialized as "[0.1,0.2,...]"
}

function parseVector(raw: string | null): number[] | null {
  if (!raw) return null;
  // pgvector text format: "[0.1,0.2,0.3]"
  const stripped = raw.replace(/^\[|\]$/g, '');
  if (!stripped) return null;
  const parts = stripped.split(',').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts;
}

export async function runClusterAssignment(): Promise<{ assigned: number }> {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL env var is required');

  const db = createDb(url, { max: 3 });

  // Fetch one row per (template, clip-embedding). We group + average in JS to avoid
  // PostgreSQL aggregate-over-array gymnastics. At MVP (<100 templates × <10 clips each)
  // this is trivial in memory.
  const rawRows = await db.execute<RawRow>(sql`
    SELECT
      ht.id AS template_id,
      ht.domain::text AS domain,
      c.embedding::text AS embedding
    FROM habit_templates ht
    LEFT JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
    LEFT JOIN clips c ON c.id = htc.clip_id AND c.embedding IS NOT NULL
  `);

  const rows = Array.isArray(rawRows) ? rawRows : ((rawRows as { rows: RawRow[] }).rows ?? []);

  // Group embeddings by template
  const grouped = new Map<string, { domain: string; embeddings: number[][] }>();
  for (const row of rows) {
    const existing = grouped.get(row.template_id);
    if (existing) {
      const vec = parseVector(row.embedding);
      if (vec) existing.embeddings.push(vec);
    } else {
      const vec = parseVector(row.embedding);
      grouped.set(row.template_id, {
        domain: row.domain,
        embeddings: vec ? [vec] : [],
      });
    }
  }

  const templates: TemplateEmbedding[] = [];
  const nullTemplateIds: string[] = [];

  for (const [templateId, { domain, embeddings }] of grouped) {
    if (embeddings.length === 0) {
      nullTemplateIds.push(templateId);
      continue;
    }
    // Element-wise mean
    const dims = embeddings[0]!.length;
    const centroid = new Array<number>(dims).fill(0);
    for (const vec of embeddings) {
      for (let i = 0; i < dims; i++) {
        centroid[i]! += vec[i];
      }
    }
    for (let i = 0; i < dims; i++) {
      centroid[i]! /= embeddings.length;
    }
    templates.push({
      templateId,
      domain: domain as TemplateEmbedding['domain'],
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
