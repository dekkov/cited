import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const podcasts = pgTable('podcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  host: text('host'),
  trustTier: integer('trust_tier').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
