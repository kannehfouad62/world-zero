import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  eventRecoverableItems,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import { SupplyRecoveryService } from './supply-recovery.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';
const ITEM_SLUG = 'maya-stolen-supply-crate';

describe('Maya supply recovery integration', () => {
  let database: DatabaseService;
  let service: SupplyRecoveryService;
  let districtId: string;
  let eventId: string;
  let itemId: string;

  const createdPlayers: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error('Supply recovery tests require world_zero_test');
    }

    database = new DatabaseService();
    service = new SupplyRecoveryService(database);

    const [district] = await database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.slug, 'district-01'))
      .limit(1);

    const [event] = await database.db
      .select({ id: worldEvents.id })
      .from(worldEvents)
      .where(eq(worldEvents.slug, 'maya-stolen-supplies-01'))
      .limit(1);

    const [item] = await database.db
      .select({ id: eventRecoverableItems.id })
      .from(eventRecoverableItems)
      .where(eq(eventRecoverableItems.slug, ITEM_SLUG))
      .limit(1);

    if (!district || !event || !item) {
      throw new Error('Seed District 01, Maya event, and supply crate first');
    }

    districtId = district.id;
    eventId = event.id;
    itemId = item.id;
  });

  afterAll(async () => {
    if (!database) return;

    try {
      for (const playerId of createdPlayers) {
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
    x = 54,
    z = 29,
    step = 2,
    decision: 'HELP' | 'REFUSE' = 'HELP',
  ): Promise<string> {
    const username = 'supply_' + randomUUID().replaceAll('-', '').slice(0, 16);

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Supply Recovery Test Player',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    createdPlayers.push(player.id);

    await database.db.insert(playerWorldPresences).values({
      playerId: player.id,
      districtId,
      positionX: String(x),
      positionY: '0',
      positionZ: String(z),
      rotationY: '0',
      version: 1,
    });

    await database.db.insert(playerEventDecisions).values({
      eventId,
      playerId: player.id,
      decision,
    });

    await database.db.insert(playerEventProgress).values({
      eventId,
      playerId: player.id,
      status: 'ACTIVE',
      currentStep: step,
    });

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

    const recoveries = await database.db
      .select()
      .from(playerRecoveredItems)
      .where(
        and(
          eq(playerRecoveredItems.playerId, playerId),
          eq(playerRecoveredItems.itemId, itemId),
        ),
      );

    return { progress, recoveries };
  }

  it('recovers supplies and advances step 2 to 3', async () => {
    const playerId = await createPlayer();

    const result = await service.recoverItem(playerId, ITEM_SLUG);

    expect(result.item.slug).toBe(ITEM_SLUG);
    expect(result.progress.previousStep).toBe(2);
    expect(result.progress.currentStep).toBe(3);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.recoveries).toHaveLength(1);
  });

  it('rejects recovery at the wrong step', async () => {
    const playerId = await createPlayer(54, 29, 1);

    await expect(
      service.recoverItem(playerId, ITEM_SLUG),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.recoveries).toHaveLength(0);
  });

  it('rejects recovery from too far away', async () => {
    const playerId = await createPlayer(-27, 14);

    await expect(
      service.recoverItem(playerId, ITEM_SLUG),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.recoveries).toHaveLength(0);
  });

  it('rejects players who refused Maya', async () => {
    const playerId = await createPlayer(54, 29, 2, 'REFUSE');

    await expect(
      service.recoverItem(playerId, ITEM_SLUG),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.recoveries).toHaveLength(0);
  });

  it('rejects duplicate supply recovery', async () => {
    const playerId = await createPlayer();

    await service.recoverItem(playerId, ITEM_SLUG);

    await expect(
      service.recoverItem(playerId, ITEM_SLUG),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.recoveries).toHaveLength(1);
  });

  it('allows only one concurrent recovery', async () => {
    const playerId = await createPlayer();

    const results = await Promise.allSettled([
      service.recoverItem(playerId, ITEM_SLUG),
      service.recoverItem(playerId, ITEM_SLUG),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(3);
    expect(state.recoveries).toHaveLength(1);
  });
});
