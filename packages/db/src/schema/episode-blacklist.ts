import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const episodeBlacklist = pgTable('episode_blacklist', {
  youtubeVideoId: text('youtube_video_id').primaryKey(),
  reason: text('reason').notNull(),                            // 'dmca' | 'speaker-request' | 'medical-risk' | 'other'
  notes: text('notes'),
  takedownRefUrl: text('takedown_ref_url'),
  blacklistedAt: timestamp('blacklisted_at', { withTimezone: true }).notNull().defaultNow(),
});
