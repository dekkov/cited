import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clips } from './clips.js';

export const clipEdits = pgTable('clip_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id')
    .notNull()
    .references(() => clips.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references((): any => sql`auth.users(id)`, { onDelete: 'set null' }),
  source: text('source').notNull(),
  field: text('field').notNull(),
  beforeValue: jsonb('before_value'),
  afterValue: jsonb('after_value'),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
