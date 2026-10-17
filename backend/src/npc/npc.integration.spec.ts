import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  npcMemories,
  npcs,
  npcPlayerRelationships,
  playerEventDecisions,
  players,
  playerWorldPresences,
  worldEvents,
} from '../database/schema.js';
import { NpcService } from './npc.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

describe('Maya persistent interaction integration', () => {
  let database: DatabaseService;
  let service: NpcService;
  let districtId: string;
  let mayaId: string;
  let eventId: string;

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error(
        'Integration tests require the isolated world_zero_test database',
      );
    }

    database = new DatabaseService();
    service = new NpcService(database);

    const [district] = await database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.slug, 'district-01'))
      .limit(1);

    const [maya] = await database.db
      .select({ id: npcs.id })
      .from(npcs)
      .where(eq(npcs.slug, 'maya'))
      .limit(1);

    const [event] = await database.db
      .select({ id: worldEvents.id })
      .from(worldEvents)
      .where(eq(worldEvents.slug, 'maya-stolen-supplies-01'))
      .limit(1);

    if (!district || !maya || !event) {
      throw new Error('Seed District 01, Maya, and her event first');
    }

    districtId = district.id;
    mayaId = maya.id;
    eventId = event.id;
  });

  afterAll(async () => {
    if (database) {
      await database.onModuleDestroy();
    }
  });

  async function createTestPlayer(x = -27, z = 18): Promise<string> {
    const username = `test_${randomUUID().replaceAll('-', '').slice(0, 20)}`;

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'NPC Integration Test',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    await database.db.insert(playerWorldPresences).values({
      playerId: player.id,
      districtId,
      positionX: String(x),
      positionY: '0',
      positionZ: String(z),
      rotationY: '0',
      version: 1,
    });

    await database.db.insert(npcPlayerRelationships).values({
      npcId: mayaId,
      playerId: player.id,
      trust: 0,
      familiarity: 0,
      respect: 0,
      resentment: 0,
    });

    return player.id;
  }

  async function getState(playerId: string) {
    const [relationship] = await database.db
      .select()
      .from(npcPlayerRelationships)
      .where(eq(npcPlayerRelationships.playerId, playerId));

    const decisions = await database.db
      .select()
      .from(playerEventDecisions)
      .where(eq(playerEventDecisions.playerId, playerId));

    const memories = await database.db
      .select()
      .from(npcMemories)
      .where(eq(npcMemories.playerId, playerId));

    return { relationship, decisions, memories };
  }

  it('records HELP once with the correct consequences', async () => {
    const playerId = await createTestPlayer();

    const response = await service.recordMayaHelpDecision(playerId, {
      decision: 'HELP',
    });

    expect(response.decision).toBe('HELP');

    const state = await getState(playerId);

    expect(state.decisions).toHaveLength(1);
    expect(state.memories).toHaveLength(1);
    expect(state.relationship.trust).toBe(15);
    expect(state.relationship.familiarity).toBe(5);
    expect(state.relationship.respect).toBe(10);
    expect(state.relationship.resentment).toBe(0);
  });

  it('rejects repeated decisions without applying more consequences', async () => {
    const playerId = await createTestPlayer();

    await service.recordMayaHelpDecision(playerId, {
      decision: 'HELP',
    });

    await expect(
      service.recordMayaHelpDecision(playerId, {
        decision: 'HELP',
      }),
    ).rejects.toMatchObject({ status: 409 });

    const state = await getState(playerId);

    expect(state.decisions).toHaveLength(1);
    expect(state.memories).toHaveLength(1);
    expect(state.relationship.trust).toBe(15);
  });

  it('rejects interactions from players who are too far away', async () => {
    const playerId = await createTestPlayer(40, 40);

    await expect(
      service.recordMayaHelpDecision(playerId, {
        decision: 'HELP',
      }),
    ).rejects.toMatchObject({ status: 403 });

    const state = await getState(playerId);

    expect(state.decisions).toHaveLength(0);
    expect(state.memories).toHaveLength(0);
    expect(state.relationship.trust).toBe(0);
  });

  it('allows only one concurrent decision', async () => {
    const playerId = await createTestPlayer();

    const results = await Promise.allSettled([
      service.recordMayaHelpDecision(playerId, {
        decision: 'HELP',
      }),
      service.recordMayaHelpDecision(playerId, {
        decision: 'REFUSE',
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const state = await getState(playerId);

    expect(state.decisions).toHaveLength(1);
    expect(state.memories).toHaveLength(1);

    const decision = state.decisions[0].decision;

    if (decision === 'HELP') {
      expect(state.relationship.trust).toBe(15);
      expect(state.relationship.respect).toBe(10);
      expect(state.relationship.resentment).toBe(0);
    } else {
      expect(decision).toBe('REFUSE');
      expect(state.relationship.trust).toBe(-8);
      expect(state.relationship.respect).toBe(0);
      expect(state.relationship.resentment).toBe(12);
    }
  });
});
