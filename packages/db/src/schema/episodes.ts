import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { episodeAvailability } from './enums';
import { podcasts } from './podcasts';

export const episodes = pgTable('episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  podcastId: uuid('podcast_id')
    .notNull()
    .references(() => podcasts.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull().unique(),
  title: text('title'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  transcriptUri: text('transcript_uri'),
  transcriptText: text('transcript_text'),
  availability: episodeAvailability('availability').notNull().default('available'),
  lastOembedCheckAt: timestamp('last_oembed_check_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
