import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { healthLogTypes } from '../constants/healthLogTypes';

export { healthLogTypes };

export const periodDates = sqliteTable('period_dates', {
  id: integer('id').primaryKey(),
  date: text('date').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const healthLogs = sqliteTable('health_logs', {
  id: integer('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type', { enum: healthLogTypes }).notNull(),
  item_id: text('item_id').notNull(),
  name: text('name'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, table => [
  check(
    'health_logs_type_check',
    sql`${table.type} in ('symptom','mood','flow','discharge','sex','notes','temperature')`
  ),
]);

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export type PeriodDate = typeof periodDates.$inferSelect;
export type HealthLog = typeof healthLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
