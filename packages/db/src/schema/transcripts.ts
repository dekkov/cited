import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Note: video_id is the natural PK (matches episodes.youtube_video_id which is unique).
// FK is enforced in migration SQL after table creation (mirrors the auth.users pattern).
// The `tsv` tsvector column is GENERATED ALWAYS in migration SQL — Drizzle does not model generated columns;
// we omit it from the TS schema and rely on the migration for the GIN index.
export const transcripts = pgTable('transcripts', {
  videoId: text('video_id').primaryKey(),                     // youtube_video_id
  source: text('source').notNull(),                           // 'youtube_captions' | 'deepgram' | 'manual'
  segments: jsonb('segments').notNull(),                      // Array<{ start, end, text, words: WordTimestamped[] }>
  rawText: text('raw_text').notNull(),                        // joined text for tsv + display
  language: text('language').notNull().default('en'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
