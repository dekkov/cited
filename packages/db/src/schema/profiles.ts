import { date, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { privacyMode, userRole } from './enums';

// Note: id references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  timezone: text('timezone').notNull().default('UTC'),
  goals: jsonb('goals').notNull().default(sql`'{}'::jsonb`),
  role: userRole('role').notNull().default('user'),
  privacyMode: privacyMode('privacy_mode').notNull().default('private'),
  disclaimerAcceptedAt: timestamp('disclaimer_accepted_at', { withTimezone: true }),
  dob: date('dob'),
  dobJurisdiction: text('dob_jurisdiction'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
