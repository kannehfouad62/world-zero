import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  eventRecoverableItems,
  npcMemories,
  npcs,
  npcPlayerRelationships,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import { MayaDeliveryService } from './maya-delivery.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

describe('Maya mission completion integration', () => {
  let database: DatabaseService;
  let service: MayaDeliveryService;
  let eventId: string;
  let districtId: string;
  let mayaId: string;
  let itemId: string;
  let mayaX: number;
  let mayaY: number;
  let mayaZ: number;

  const createdPlayers: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error('Mission tests require isolated world_zero_test');
    }

    database = new DatabaseService();
    service = new MayaDeliveryService(database);

    const [event] = await database.db
      .select()
      .from(worldEvents)
      .where(eq(worldEvents.slug, 'maya-stolen-supplies-01'))
      .limit(1);

    const [maya] = await database.db
      .select()
      .from(npcs)
      .where(eq(npcs.slug, 'maya'))
      .limit(1);

    const [item] = await database.db
      .select()
      .from(eventRecoverableItems)
      .where(eq(eventRecoverableItems.slug, 'maya-stolen-supply-crate'))
      .limit(1);

    if (!event || !maya || !item) {
      throw new Error('Seed Maya, her event, and the supply crate first');
    }

    eventId = event.id;
    districtId = event.districtId;
    mayaId = maya.id;
    itemId = item.id;

    mayaX = Number(maya.positionX);
    mayaY = Number(maya.positionY);
    mayaZ = Number(maya.positionZ);
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
      step?: number;
      hasSupplies?: boolean;
      farAway?: boolean;
      decision?: 'HELP' | 'REFUSE';
      hasRelationship?: boolean;
    } = {},
  ): Promise<string> {
    const username =
      'delivery_' + randomUUID().replaceAll('-', '').slice(0, 16);

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Mission Completion Test Player',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    createdPlayers.push(player.id);

    await database.db.insert(playerWorldPresences).values({
      playerId: player.id,
      districtId,
      positionX: String(options.farAway ? mayaX + 30 : mayaX),
      positionY: String(mayaY),
      positionZ: String(mayaZ),
      rotationY: '0',
      version: 1,
    });

    await database.db.insert(playerEventDecisions).values({
      eventId,
      playerId: player.id,
      decision: options.decision ?? 'HELP',
    });

    await database.db.insert(playerEventProgress).values({
      eventId,
      playerId: player.id,
      status: 'ACTIVE',
      currentStep: options.step ?? 3,
    });

    if (options.hasSupplies !== false) {
      await database.db.insert(playerRecoveredItems).values({
        itemId,
        eventId,
        playerId: player.id,
      });
    }

    if (options.hasRelationship !== false) {
      await database.db.insert(npcPlayerRelationships).values({
        npcId: mayaId,
        playerId: player.id,
        trust: 15,
        familiarity: 5,
        respect: 10,
        resentment: 0,
      });
    }

    return player.id;
  }

  async function getState(playerId: string) {
    const [progress] = await database.db
      .select()
      .from(playerEventProgress)
      .where(
        and(
          eq(playerEventProgress.playerId, playerId),
          eq(playerEventProgress.eventId, eventId),
        ),
      );

    const [relationship] = await database.db
      .select()
      .from(npcPlayerRelationships)
      .where(
        and(
          eq(npcPlayerRelationships.playerId, playerId),
          eq(npcPlayerRelationships.npcId, mayaId),
        ),
      );

    const memories = await database.db
      .select()
      .from(npcMemories)
      .where(
        and(eq(npcMemories.playerId, playerId), eq(npcMemories.npcId, mayaId)),
      );

    return { progress, relationship, memories };
  }

  it('completes the investigation and records consequences', async () => {
    const playerId = await createPlayer();

    const result = await service.deliverSupplies(playerId);

    expect(result.status).toBe('COMPLETED');
    expect(result.previousStep).toBe(3);
    expect(result.currentStep).toBe(4);
    expect(result.memory.type).toBe('HELP');

    const state = await getState(playerId);

    expect(state.progress.status).toBe('COMPLETED');
    expect(state.progress.currentStep).toBe(4);
    expect(state.progress.completedAt).toBeInstanceOf(Date);

    expect(state.relationship.trust).toBe(35);
    expect(state.relationship.familiarity).toBe(10);
    expect(state.relationship.respect).toBe(25);
    expect(state.relationship.resentment).toBe(0);

    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].importance).toBe(90);
  });

  it('rejects delivery without recovered supplies', async () => {
    const playerId = await createPlayer({
      hasSupplies: false,
    });

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 403,
    });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.memories).toHaveLength(0);
  });

  it('rejects delivery at the wrong investigation step', async () => {
    const playerId = await createPlayer({ step: 2 });

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 409,
    });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.memories).toHaveLength(0);
  });

  it('rejects delivery from too far away', async () => {
    const playerId = await createPlayer({
      farAway: true,
    });

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 403,
    });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.memories).toHaveLength(0);
  });

  it('rejects delivery from a player who refused Maya', async () => {
    const playerId = await createPlayer({
      decision: 'REFUSE',
    });

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 403,
    });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.memories).toHaveLength(0);
  });

  it('rejects duplicate completion without extra rewards', async () => {
    const playerId = await createPlayer();

    await service.deliverSupplies(playerId);

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 409,
    });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(4);
    expect(state.relationship.trust).toBe(35);
    expect(state.relationship.respect).toBe(25);
    expect(state.memories).toHaveLength(1);
  });

  it('allows only one concurrent completion', async () => {
    const playerId = await createPlayer();

    const results = await Promise.allSettled([
      service.deliverSupplies(playerId),
      service.deliverSupplies(playerId),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(4);
    expect(state.relationship.trust).toBe(35);
    expect(state.memories).toHaveLength(1);
  });

  it('rolls back completion if the relationship is missing', async () => {
    const playerId = await createPlayer({
      hasRelationship: false,
    });

    await expect(service.deliverSupplies(playerId)).rejects.toMatchObject({
      status: 404,
    });

    const state = await getState(playerId);

    expect(state.progress.status).toBe('ACTIVE');
    expect(state.progress.currentStep).toBe(3);
    expect(state.progress.completedAt).toBeNull();
    expect(state.memories).toHaveLength(0);
  });
});
