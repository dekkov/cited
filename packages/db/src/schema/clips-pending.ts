import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { clipDomain, evidenceStrength, speakerStatus } from './enums';
import { episodes } from './episodes';
import { extractionJobs } from './extraction-jobs';

export const clipsPending = pgTable('clips_pending', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
  extractionJobId: uuid('extraction_job_id').references(() => extractionJobs.id, {
    onDelete: 'set null',
  }),
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
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
