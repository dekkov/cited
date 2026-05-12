import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clipDomain, clipStatus, evidenceStrength, speakerStatus } from './enums';
import { episodes } from './episodes';

// Note: createdBy and approvedBy reference auth.users(id) on delete set null
// These FKs are managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  startSeconds: integer('start_seconds').notNull(),
  endSeconds: integer('end_seconds').notNull(),
  claim: text('claim').notNull(),
  rationale: text('rationale'),
  speaker: text('speaker').notNull(),
  speakerStatus: speakerStatus('speaker_status').notNull(),
  domain: clipDomain('domain').notNull(),
  evidenceStrength: evidenceStrength('evidence_strength'),
  riskFlags: text('risk_flags').array().notNull().default(sql`'{}'::text[]`),
  status: clipStatus('status').notNull().default('pending'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdBy: uuid('created_by'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  removalReason: text('removal_reason'),
  removalNotes: text('removal_notes'),
  takedownRefUrl: text('takedown_ref_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
