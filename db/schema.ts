import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const periodDates = sqliteTable('period_dates', {
  id: integer('id').primaryKey(),
  date: text('date').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const healthLogs = sqliteTable('health_logs', {
  id: integer('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'symptom', 'mood', 'flow', 'discharge', 'sex', 'notes'
  item_id: text('item_id').notNull(),
  name: text('name'), // Only used for 'notes' type to store actual note text
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export type PeriodDate = typeof periodDates.$inferSelect;
export type HealthLog = typeof healthLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
