import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { consentScope } from './enums.js';

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references((): any => sql`auth.users(id)`, { onDelete: 'cascade' }),
  scope: consentScope('scope').notNull(),
  granted: boolean('granted').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
});
