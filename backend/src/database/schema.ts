import {
  bigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  uniqueIndex,
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

  lastRecoveredAt: timestamp('last_recovered_at', {
    withTimezone: true,
  }),

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

export const locationTypeEnum = pgEnum('location_type', [
  'RESTAURANT',
  'STORE',
  'RESIDENTIAL',
  'BANK',
  'POLICE_STATION',
  'HOSPITAL',
  'WAREHOUSE',
  'OFFICE',
  'PARK',
]);

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),

  districtId: uuid('district_id')
    .notNull()
    .references(() => districts.id, {
      onDelete: 'cascade',
    }),

  slug: text('slug').notNull().unique(),

  name: text('name').notNull(),

  type: locationTypeEnum('type').notNull(),

  positionX: text('position_x').notNull(),

  positionY: text('position_y').notNull(),

  positionZ: text('position_z').notNull(),

  isActive: boolean('is_active').notNull().default(true),

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

export const npcStatusEnum = pgEnum('npc_status', [
  'ACTIVE',
  'INACTIVE',
  'DECEASED',
]);

export const npcs = pgTable('npcs', {
  id: uuid('id').defaultRandom().primaryKey(),

  districtId: uuid('district_id')
    .notNull()
    .references(() => districts.id, {
      onDelete: 'restrict',
    }),

  currentLocationId: uuid('current_location_id').references(
    () => locations.id,
    {
      onDelete: 'set null',
    },
  ),

  slug: text('slug').notNull().unique(),

  firstName: text('first_name').notNull(),

  lastName: text('last_name'),

  occupation: text('occupation').notNull(),

  status: npcStatusEnum('status').notNull().default('ACTIVE'),

  positionX: text('position_x').notNull(),

  positionY: text('position_y').notNull(),

  positionZ: text('position_z').notNull(),

  personality: text('personality').notNull(),

  energy: integer('energy').notNull().default(100),

  stress: integer('stress').notNull().default(20),

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

export const npcPlayerRelationships = pgTable('npc_player_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),

  npcId: uuid('npc_id')
    .notNull()
    .references(() => npcs.id, {
      onDelete: 'cascade',
    }),

  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, {
      onDelete: 'cascade',
    }),

  trust: integer('trust').notNull().default(0),

  familiarity: integer('familiarity').notNull().default(0),

  respect: integer('respect').notNull().default(0),

  resentment: integer('resentment').notNull().default(0),

  lastInteractionAt: timestamp('last_interaction_at', {
    withTimezone: true,
  }),

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

export const npcMemoryTypeEnum = pgEnum('npc_memory_type', [
  'INTERACTION',
  'PROMISE',
  'HELP',
  'BETRAYAL',
  'CONFLICT',
  'BUSINESS',
  'WORLD_EVENT',
  'PERSONAL',
]);

export const npcMemories = pgTable('npc_memories', {
  id: uuid('id').defaultRandom().primaryKey(),

  npcId: uuid('npc_id')
    .notNull()
    .references(() => npcs.id, {
      onDelete: 'cascade',
    }),

  playerId: uuid('player_id').references(() => players.id, {
    onDelete: 'set null',
  }),

  type: npcMemoryTypeEnum('type').notNull(),

  summary: text('summary').notNull(),

  importance: integer('importance').notNull().default(50),

  occurredAt: timestamp('occurred_at', {
    withTimezone: true,
  }).notNull(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const worldEventStatusEnum = pgEnum('world_event_status', [
  'AVAILABLE',
  'RESOLVED',
  'CANCELLED',
]);

export const playerEventDecisionEnum = pgEnum('player_event_decision', [
  'HELP',
  'REFUSE',
]);

export const worldEvents = pgTable('world_events', {
  id: uuid('id').defaultRandom().primaryKey(),

  slug: text('slug').notNull().unique(),

  districtId: uuid('district_id')
    .notNull()
    .references(() => districts.id, {
      onDelete: 'restrict',
    }),

  npcId: uuid('npc_id')
    .notNull()
    .references(() => npcs.id, {
      onDelete: 'restrict',
    }),

  title: text('title').notNull(),

  description: text('description').notNull(),

  status: worldEventStatusEnum('status').notNull().default('AVAILABLE'),

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

export const playerEventDecisions = pgTable(
  'player_event_decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    eventId: uuid('event_id')
      .notNull()
      .references(() => worldEvents.id, {
        onDelete: 'restrict',
      }),

    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, {
        onDelete: 'restrict',
      }),

    decision: playerEventDecisionEnum('decision').notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('player_event_decisions_event_player_unique').on(
      table.eventId,
      table.playerId,
    ),
  ],
);

export const playerEventProgressStatusEnum = pgEnum(
  'player_event_progress_status',
  ['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED'],
);

export const playerEventProgress = pgTable(
  'player_event_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    eventId: uuid('event_id')
      .notNull()
      .references(() => worldEvents.id, {
        onDelete: 'restrict',
      }),

    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, {
        onDelete: 'restrict',
      }),

    status: playerEventProgressStatusEnum('status').notNull().default('ACTIVE'),

    currentStep: integer('current_step').notNull().default(0),

    startedAt: timestamp('started_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    completedAt: timestamp('completed_at', {
      withTimezone: true,
    }),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('player_event_progress_event_player_unique').on(
      table.eventId,
      table.playerId,
    ),
  ],
);

export const eventClues = pgTable('event_clues', {
  id: uuid('id').defaultRandom().primaryKey(),

  eventId: uuid('event_id')
    .notNull()
    .references(() => worldEvents.id, { onDelete: 'restrict' }),

  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),

  districtId: uuid('district_id')
    .notNull()
    .references(() => districts.id, { onDelete: 'restrict' }),

  positionX: text('position_x').notNull(),
  positionY: text('position_y').notNull(),
  positionZ: text('position_z').notNull(),

  requiredStep: integer('required_step').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const playerClueDiscoveries = pgTable(
  'player_clue_discoveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    clueId: uuid('clue_id')
      .notNull()
      .references(() => eventClues.id, { onDelete: 'restrict' }),

    eventId: uuid('event_id')
      .notNull()
      .references(() => worldEvents.id, { onDelete: 'restrict' }),

    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'restrict' }),

    discoveredAt: timestamp('discovered_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('player_clue_discoveries_player_clue_unique').on(
      table.playerId,
      table.clueId,
    ),
  ],
);
