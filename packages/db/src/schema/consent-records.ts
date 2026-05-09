import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { consentScope } from './enums';

// Note: userId references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  scope: consentScope('scope').notNull(),
  granted: boolean('granted').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
});
