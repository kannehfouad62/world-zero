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

export const playerStatusEnum = pgEnum('player_status', [
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),

  username: text('username').notNull().unique(),

  displayName: text('display_name').notNull(),

  status: playerStatusEnum('status').notNull().default('ACTIVE'),

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

  lastSeenAt: timestamp('last_seen_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const playerWorldPresences = pgTable('player_world_presences', {
  id: uuid('id').defaultRandom().primaryKey(),

  playerId: uuid('player_id')
    .notNull()
    .unique()
    .references(() => players.id, {
      onDelete: 'cascade',
    }),

  districtId: uuid('district_id')
    .notNull()
    .references(() => districts.id, {
      onDelete: 'restrict',
    }),

  positionX: text('position_x').notNull().default('0'),

  positionY: text('position_y').notNull().default('0'),

  positionZ: text('position_z').notNull().default('0'),

  rotationY: text('rotation_y').notNull().default('0'),

  version: bigint('version', {
    mode: 'number',
  })
    .notNull()
    .default(1),

  enteredAt: timestamp('entered_at', {
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

export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'LOCKED',
  'DISABLED',
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),

  playerId: uuid('player_id')
    .notNull()
    .unique()
    .references(() => players.id, {
      onDelete: 'cascade',
    }),

  email: text('email').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  status: accountStatusEnum('status').notNull().default('ACTIVE'),

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

  lastLoginAt: timestamp('last_login_at', {
    withTimezone: true,
  }),
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),

  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, {
      onDelete: 'cascade',
    }),

  refreshTokenHash: text('refresh_token_hash').notNull().unique(),

  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),

  revokedAt: timestamp('revoked_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  lastUsedAt: timestamp('last_used_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});
