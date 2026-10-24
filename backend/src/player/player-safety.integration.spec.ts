import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  players,
  playerWorldPresences,
} from '../database/schema.js';
import { PlayerService } from './player.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

describe('District 01 movement safety integration', () => {
  let database: DatabaseService;
  let service: PlayerService;
  let playerId: string;

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error('Tests require the isolated world_zero_test database');
    }

    database = new DatabaseService();
    service = new PlayerService(database);

    const [district] = await database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.slug, 'district-01'))
      .limit(1);

    if (!district) {
      throw new Error('District 01 is not seeded');
    }

    const [player] = await database.db
      .insert(players)
      .values({
        username: 'safety_' + randomUUID().replaceAll('-', '').slice(0, 16),
        displayName: 'Safety Test Player',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    playerId = player.id;

    await database.db.insert(playerWorldPresences).values({
      playerId,
      districtId: district.id,
      positionX: '0',
      positionY: '0',
      positionZ: '0',
      rotationY: '0',
      version: 1,
    });
  });

  afterAll(async () => {
    if (!database) return;

    try {
      if (playerId) {
        await database.db
          .delete(playerWorldPresences)
          .where(eq(playerWorldPresences.playerId, playerId));

        await database.db.delete(players).where(eq(players.id, playerId));
      }
    } finally {
      await database.onModuleDestroy();
    }
  });

  async function currentState() {
    return service.getPlayer(playerId);
  }

  it('accepts legitimate movement inside District 01', async () => {
    const before = await currentState();

    const updated = await service.updatePosition(playerId, {
      position: { x: 5, y: 0, z: 5 },
      rotationY: 0,
      expectedVersion: before.presence.version,
    });

    expect(updated.presence.position.x).toBe(5);
    expect(updated.presence.position.z).toBe(5);
    expect(updated.presence.version).toBe(before.presence.version + 1);
  });

  it('rejects movement outside the district', async () => {
    const before = await currentState();

    await expect(
      service.updatePosition(playerId, {
        position: { x: 75, y: 0, z: 5 },
        rotationY: 0,
        expectedVersion: before.presence.version,
      }),
    ).rejects.toMatchObject({ status: 400 });

    const after = await currentState();

    expect(after.presence.position).toEqual(before.presence.position);

    expect(after.presence.version).toBe(before.presence.version);
  });

  it('rejects positions below the playable ground', async () => {
    const before = await currentState();

    await expect(
      service.updatePosition(playerId, {
        position: { x: 5, y: -15, z: 5 },
        rotationY: 0,
        expectedVersion: before.presence.version,
      }),
    ).rejects.toMatchObject({ status: 400 });

    const after = await currentState();

    expect(after.presence.version).toBe(before.presence.version);
  });

  it('rejects stale position versions', async () => {
    const before = await currentState();

    await expect(
      service.updatePosition(playerId, {
        position: { x: 6, y: 0, z: 6 },
        rotationY: 0,
        expectedVersion: before.presence.version - 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
