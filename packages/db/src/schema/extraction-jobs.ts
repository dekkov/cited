import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { extractionJobStatus } from './enums';
import { podcasts } from './podcasts';

export const extractionJobs = pgTable('extraction_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  podcastId: uuid('podcast_id').references(() => podcasts.id, { onDelete: 'set null' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  status: extractionJobStatus('status').notNull().default('pending'),
  claimedBy: text('claimed_by'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
