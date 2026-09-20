import {
  bigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const worldStatusEnum = pgEnum('world_status', [
  'ONLINE',
  'MAINTENANCE',
  'OFFLINE',
]);

export const worlds = pgTable('worlds', {
  id: uuid('id').defaultRandom().primaryKey(),

  slug: text('slug').notNull().unique(),

  name: text('name').notNull(),

  status: worldStatusEnum('status').notNull().default('ONLINE'),

  tick: bigint('tick', { mode: 'number' }).notNull().default(0),

  simulationTime: timestamp('simulation_time', {
    withTimezone: true,
  }).notNull(),

  lastProcessedAt: timestamp('last_processed_at', {
    withTimezone: true,
  }).notNull(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const cities = pgTable('cities', {
  id: uuid('id').defaultRandom().primaryKey(),

  worldId: uuid('world_id')
    .notNull()
    .references(() => worlds.id, {
      onDelete: 'cascade',
    }),

  slug: text('slug').notNull().unique(),

  name: text('name').notNull(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const districts = pgTable('districts', {
  id: uuid('id').defaultRandom().primaryKey(),

  cityId: uuid('city_id')
    .notNull()
    .references(() => cities.id, {
      onDelete: 'cascade',
    }),

  slug: text('slug').notNull().unique(),

  name: text('name').notNull(),

  status: worldStatusEnum('status').notNull().default('ONLINE'),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
