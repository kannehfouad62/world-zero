import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  eventClues,
  eventRecoverableItems,
  npcMemories,
  npcPlayerRelationships,
  playerClueDiscoveries,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import { MissionJournalService } from './mission-journal.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

const EVENT_SLUG = 'maya-stolen-supplies-01';

describe('Persistent mission journal integration', () => {
  let database: DatabaseService;
  let service: MissionJournalService;

  let eventId: string;
  let districtId: string;
  let npcId: string;
  let clueId: string;
  let itemId: string;

  const createdPlayers: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error('Mission journal tests require world_zero_test');
    }

    database = new DatabaseService();
    service = new MissionJournalService(database);

    const [event] = await database.db
      .select()
      .from(worldEvents)
      .where(eq(worldEvents.slug, EVENT_SLUG))
      .limit(1);

    const [clue] = await database.db
      .select()
      .from(eventClues)
      .where(eq(eventClues.slug, 'maya-delivery-receipt'))
      .limit(1);

    const [item] = await database.db
      .select()
      .from(eventRecoverableItems)
      .where(eq(eventRecoverableItems.slug, 'maya-stolen-supply-crate'))
      .limit(1);

    if (!event || !clue || !item) {
      throw new Error(
        'Seed Maya event, evidence, and supplies in world_zero_test',
      );
    }

    eventId = event.id;
    districtId = event.districtId;
    npcId = event.npcId;
    clueId = clue.id;
    itemId = item.id;
  });

  afterAll(async () => {
    if (!database) return;

    try {
      for (const playerId of createdPlayers) {
        await database.db
          .delete(npcMemories)
          .where(eq(npcMemories.playerId, playerId));

        await database.db
          .delete(npcPlayerRelationships)
          .where(eq(npcPlayerRelationships.playerId, playerId));

        await database.db
          .delete(playerRecoveredItems)
          .where(eq(playerRecoveredItems.playerId, playerId));

        await database.db
          .delete(playerClueDiscoveries)
          .where(eq(playerClueDiscoveries.playerId, playerId));

        await database.db
          .delete(playerEventProgress)
          .where(eq(playerEventProgress.playerId, playerId));

        await database.db
          .delete(playerEventDecisions)
          .where(eq(playerEventDecisions.playerId, playerId));

        await database.db
          .delete(playerWorldPresences)
          .where(eq(playerWorldPresences.playerId, playerId));

        await database.db.delete(players).where(eq(players.id, playerId));
      }
    } finally {
      await database.onModuleDestroy();
    }
  });

  async function createPlayer(
    options: {
      mission?: boolean;
      completed?: boolean;
      evidence?: boolean;
      supplies?: boolean;
      memory?: boolean;
    } = {},
  ): Promise<string> {
    const username = 'journal_' + randomUUID().replaceAll('-', '').slice(0, 16);

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Journal Test Player',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    createdPlayers.push(player.id);

    await database.db.insert(playerWorldPresences).values({
      playerId: player.id,
      districtId,
      positionX: '0',
      positionY: '0',
      positionZ: '0',
      rotationY: '0',
      version: 1,
    });

    if (options.mission === false) {
      return player.id;
    }

    const completed = options.completed === true;

    await database.db.insert(playerEventDecisions).values({
      eventId,
      playerId: player.id,
      decision: 'HELP',
    });

    await database.db.insert(playerEventProgress).values({
      eventId,
      playerId: player.id,
      status: completed ? 'COMPLETED' : 'ACTIVE',
      currentStep: completed ? 4 : 2,
      completedAt: completed ? new Date() : null,
    });

    await database.db.insert(npcPlayerRelationships).values({
      npcId,
      playerId: player.id,
      trust: completed ? 35 : 15,
      familiarity: completed ? 10 : 5,
      respect: completed ? 25 : 10,
      resentment: 0,
    });

    if (options.evidence) {
      await database.db.insert(playerClueDiscoveries).values({
        clueId,
        eventId,
        playerId: player.id,
      });
    }

    if (options.supplies) {
      await database.db.insert(playerRecoveredItems).values({
        itemId,
        eventId,
        playerId: player.id,
      });
    }

    if (options.memory) {
      await database.db.insert(npcMemories).values({
        npcId,
        playerId: player.id,
        type: 'HELP',
        summary: completed
          ? 'The player fulfilled the promise to Maya.'
          : 'The player agreed to help Maya.',
        importance: completed ? 90 : 75,
        occurredAt: new Date(),
      });
    }

    return player.id;
  }

  it('returns an empty journal for a player without missions', async () => {
    const playerId = await createPlayer({
      mission: false,
    });

    const result = await service.getJournal(playerId);

    expect(result.missions).toEqual([]);
  });

  it('returns an active investigation', async () => {
    const playerId = await createPlayer();

    const result = await service.getJournal(playerId);

    expect(result.missions).toHaveLength(1);
    expect(result.missions[0].status).toBe('ACTIVE');
    expect(result.missions[0].currentStep).toBe(2);
    expect(result.missions[0].totalSteps).toBe(4);
    expect(result.missions[0].completedAt).toBeNull();
    expect(result.missions[0].decision).toBe('HELP');
  });

  it('returns a completed investigation with its timestamp', async () => {
    const playerId = await createPlayer({
      completed: true,
    });

    const result = await service.getJournal(playerId);
    const mission = result.missions[0];

    expect(mission.status).toBe('COMPLETED');
    expect(mission.currentStep).toBe(4);
    expect(mission.completedAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(mission.completedAt!))).toBe(false);
  });

  it('returns evidence and recovered supplies', async () => {
    const playerId = await createPlayer({
      completed: true,
      evidence: true,
      supplies: true,
    });

    const result = await service.getJournal(playerId);
    const mission = result.missions[0];

    expect(mission.evidence).toHaveLength(1);
    expect(mission.evidence[0].slug).toBe('maya-delivery-receipt');

    expect(mission.recoveredItems).toHaveLength(1);
    expect(mission.recoveredItems[0].slug).toBe('maya-stolen-supply-crate');
  });

  it('returns NPC relationships and memories', async () => {
    const playerId = await createPlayer({
      completed: true,
      memory: true,
    });

    const result = await service.getJournal(playerId);
    const mission = result.missions[0];

    expect(mission.npc.name).toBe('Maya');
    expect(mission.relationship?.trust).toBe(35);
    expect(mission.relationship?.respect).toBe(25);

    expect(mission.memories).toHaveLength(1);
    expect(mission.memories[0].importance).toBe(90);
  });

  it('isolates mission history between players', async () => {
    const firstPlayer = await createPlayer({
      completed: true,
      evidence: true,
      supplies: true,
      memory: true,
    });

    const secondPlayer = await createPlayer({
      mission: false,
    });

    const firstJournal = await service.getJournal(firstPlayer);

    const secondJournal = await service.getJournal(secondPlayer);

    expect(firstJournal.missions).toHaveLength(1);
    expect(secondJournal.missions).toHaveLength(0);
  });

  it('does not expose another player evidence or memories', async () => {
    const firstPlayer = await createPlayer({
      evidence: true,
      supplies: true,
      memory: true,
    });

    const secondPlayer = await createPlayer();

    const firstJournal = await service.getJournal(firstPlayer);

    const secondJournal = await service.getJournal(secondPlayer);

    expect(firstJournal.missions[0].evidence).toHaveLength(1);
    expect(firstJournal.missions[0].memories).toHaveLength(1);

    expect(secondJournal.missions[0].evidence).toHaveLength(0);
    expect(secondJournal.missions[0].recoveredItems).toHaveLength(0);
    expect(secondJournal.missions[0].memories).toHaveLength(0);
  });

  it('does not modify investigation progress when reading', async () => {
    const playerId = await createPlayer({
      completed: true,
      evidence: true,
      supplies: true,
    });

    const [before] = await database.db
      .select()
      .from(playerEventProgress)
      .where(eq(playerEventProgress.playerId, playerId));

    await service.getJournal(playerId);
    await service.getJournal(playerId);

    const [after] = await database.db
      .select()
      .from(playerEventProgress)
      .where(eq(playerEventProgress.playerId, playerId));

    expect(after.status).toBe(before.status);
    expect(after.currentStep).toBe(before.currentStep);
    expect(after.completedAt?.getTime()).toBe(before.completedAt?.getTime());
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });
});
