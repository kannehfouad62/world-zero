import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  eventClues,
  playerClueDiscoveries,
  playerEventDecisions,
  playerEventProgress,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import { ObjectiveService } from './objective.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

const WAREHOUSE_CLUE = 'maya-warehouse-shipping-record';

describe('Warehouse investigation integration', () => {
  let database: DatabaseService;
  let service: ObjectiveService;
  let districtId: string;
  let eventId: string;
  let clueId: string;

  const createdPlayers: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error(
        'Warehouse tests require the isolated world_zero_test database',
      );
    }

    database = new DatabaseService();
    service = new ObjectiveService(database);

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

    const [clue] = await database.db
      .select({ id: eventClues.id })
      .from(eventClues)
      .where(eq(eventClues.slug, WAREHOUSE_CLUE))
      .limit(1);

    if (!district || !event || !clue) {
      throw new Error('Seed District 01, Maya event and warehouse clue first');
    }

    districtId = district.id;
    eventId = event.id;
    clueId = clue.id;
  });

  afterAll(async () => {
    if (!database) return;

    try {
      for (const playerId of createdPlayers) {
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
    x = 50,
    z = 29,
    step = 1,
    decision: 'HELP' | 'REFUSE' = 'HELP',
  ): Promise<string> {
    const username = `warehouse_${randomUUID().replaceAll('-', '').slice(0, 18)}`;

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Warehouse Test Player',
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

    const discoveries = await database.db
      .select()
      .from(playerClueDiscoveries)
      .where(
        and(
          eq(playerClueDiscoveries.playerId, playerId),
          eq(playerClueDiscoveries.clueId, clueId),
        ),
      );

    return { progress, discoveries };
  }

  it('advances warehouse investigation from step 1 to 2', async () => {
    const playerId = await createPlayer();

    const response = await service.inspectClue(playerId, WAREHOUSE_CLUE);

    expect(response.clue.slug).toBe(WAREHOUSE_CLUE);
    expect(response.progress.previousStep).toBe(1);
    expect(response.progress.currentStep).toBe(2);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.discoveries).toHaveLength(1);
  });

  it('rejects warehouse inspection before step 1', async () => {
    const playerId = await createPlayer(50, 29, 0);

    await expect(
      service.inspectClue(playerId, WAREHOUSE_CLUE),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(0);
    expect(state.discoveries).toHaveLength(0);
  });

  it('rejects inspection from too far away', async () => {
    const playerId = await createPlayer(-27, 14);

    await expect(
      service.inspectClue(playerId, WAREHOUSE_CLUE),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(0);
  });

  it('rejects players who refused Maya', async () => {
    const playerId = await createPlayer(50, 29, 1, 'REFUSE');

    await expect(
      service.inspectClue(playerId, WAREHOUSE_CLUE),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(0);
  });

  it('does not allow duplicate warehouse discoveries', async () => {
    const playerId = await createPlayer();

    await service.inspectClue(playerId, WAREHOUSE_CLUE);

    await expect(
      service.inspectClue(playerId, WAREHOUSE_CLUE),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.discoveries).toHaveLength(1);
  });

  it('allows only one concurrent warehouse inspection', async () => {
    const playerId = await createPlayer();

    const results = await Promise.allSettled([
      service.inspectClue(playerId, WAREHOUSE_CLUE),
      service.inspectClue(playerId, WAREHOUSE_CLUE),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(2);
    expect(state.discoveries).toHaveLength(1);
  });
});
