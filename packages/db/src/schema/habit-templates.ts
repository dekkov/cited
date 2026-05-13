import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clipDomain, frequency } from './enums';

export const habitTemplates = pgTable('habit_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  domain: clipDomain('domain').notNull(),
  trigger: text('trigger'),
  tinyAction: text('tiny_action'),
  defaultFrequency: frequency('default_frequency').notNull().default('daily'),
  // Phase 3: cluster_id for swap diversity (SWAP-02); computed weekly by pg_cron (Plan 03-06)
  clusterId: integer('cluster_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
