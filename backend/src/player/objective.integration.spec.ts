import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
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
const CLUE_SLUG = 'maya-delivery-receipt';

describe('Maya clue discovery integration', () => {
  let database: DatabaseService;
  let service: ObjectiveService;
  let districtId: string;
  let eventId: string;
  let clueId: string;

  const createdPlayerIds: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error(
        'Integration tests require the isolated world_zero_test database',
      );
    }

    database = new DatabaseService();
    service = new ObjectiveService(database);

    const [district] = await database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.slug, 'district-01'));

    const [event] = await database.db
      .select({ id: worldEvents.id })
      .from(worldEvents)
      .where(eq(worldEvents.slug, 'maya-stolen-supplies-01'));

    const [clue] = await database.db
      .select({ id: eventClues.id })
      .from(eventClues)
      .where(eq(eventClues.slug, CLUE_SLUG));

    if (!district || !event || !clue) {
      throw new Error(
        'Seed District 01, Maya event, and delivery receipt first',
      );
    }

    districtId = district.id;
    eventId = event.id;
    clueId = clue.id;
  });

  afterAll(async () => {
    if (!database) return;

    for (const playerId of createdPlayerIds) {
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

    await database.onModuleDestroy();
  });

  async function createTestPlayer(
    x = -27,
    z = 14,
    decision: 'HELP' | 'REFUSE' = 'HELP',
    step = 0,
  ): Promise<string> {
    const username = `clue_test_${randomUUID().replaceAll('-', '').slice(0, 18)}`;

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Clue Integration Test',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    createdPlayerIds.push(player.id);

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

  it('records the clue and advances progress exactly once', async () => {
    const playerId = await createTestPlayer();

    const response = await service.inspectClue(playerId, CLUE_SLUG);

    expect(response.clue.slug).toBe(CLUE_SLUG);
    expect(response.progress.previousStep).toBe(0);
    expect(response.progress.currentStep).toBe(1);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(1);
  });

  it('rejects duplicate inspection', async () => {
    const playerId = await createTestPlayer();

    await service.inspectClue(playerId, CLUE_SLUG);

    await expect(
      service.inspectClue(playerId, CLUE_SLUG),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(1);
  });

  it('rejects inspection from too far away', async () => {
    const playerId = await createTestPlayer(40, 40);

    await expect(
      service.inspectClue(playerId, CLUE_SLUG),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(0);
    expect(state.discoveries).toHaveLength(0);
  });

  it('rejects players who refused Maya', async () => {
    const playerId = await createTestPlayer(-27, 14, 'REFUSE');

    await expect(
      service.inspectClue(playerId, CLUE_SLUG),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(0);
    expect(state.discoveries).toHaveLength(0);
  });

  it('rejects inspection at the wrong investigation step', async () => {
    const playerId = await createTestPlayer(-27, 14, 'HELP', 1);

    await expect(
      service.inspectClue(playerId, CLUE_SLUG),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(0);
  });

  it('allows only one concurrent inspection', async () => {
    const playerId = await createTestPlayer();

    const results = await Promise.allSettled([
      service.inspectClue(playerId, CLUE_SLUG),
      service.inspectClue(playerId, CLUE_SLUG),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const state = await getState(playerId);

    expect(state.progress.currentStep).toBe(1);
    expect(state.discoveries).toHaveLength(1);
  });
});
