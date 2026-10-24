import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  players,
  playerWorldPresences,
} from '../database/schema.js';
import {
  DISTRICT_01_SAFE_SPAWN,
  PLAYER_RECOVERY_COOLDOWN_SECONDS,
} from './player.constants.js';
import { PlayerRecoveryService } from './player-recovery.service.js';
import { PlayerService } from './player.service.js';

const TEST_DATABASE = 'postgresql://localhost:5432/world_zero_test';

describe('Player recovery integration', () => {
  let database: DatabaseService;
  let playerService: PlayerService;
  let recoveryService: PlayerRecoveryService;
  let districtId: string;

  const createdPlayers: string[] = [];

  beforeAll(async () => {
    if (process.env.DATABASE_URL !== TEST_DATABASE) {
      throw new Error(
        'Recovery tests require the isolated world_zero_test database',
      );
    }

    database = new DatabaseService();
    playerService = new PlayerService(database);
    recoveryService = new PlayerRecoveryService(database, playerService);

    const [district] = await database.db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.slug, 'district-01'))
      .limit(1);

    if (!district) {
      throw new Error('District 01 is not seeded');
    }

    districtId = district.id;
  });

  afterAll(async () => {
    if (!database) return;

    try {
      for (const playerId of createdPlayers) {
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
    x: number,
    y: number,
    z: number,
    lastRecoveredAt: Date | null = null,
  ): Promise<string> {
    const username =
      'recovery_' + randomUUID().replaceAll('-', '').slice(0, 14);

    const [player] = await database.db
      .insert(players)
      .values({
        username,
        displayName: 'Recovery Test Player',
        status: 'ACTIVE',
      })
      .returning({ id: players.id });

    createdPlayers.push(player.id);

    await database.db.insert(playerWorldPresences).values({
      playerId: player.id,
      districtId,
      positionX: String(x),
      positionY: String(y),
      positionZ: String(z),
      rotationY: '0',
      version: 1,
      lastRecoveredAt,
    });

    return player.id;
  }

  async function getPresence(playerId: string) {
    const [presence] = await database.db
      .select()
      .from(playerWorldPresences)
      .where(eq(playerWorldPresences.playerId, playerId))
      .limit(1);

    return presence;
  }

  it('recovers an invalid saved position', async () => {
    const playerId = await createPlayer(90, -15, 90);

    const result = await recoveryService.recoverPosition(playerId);

    expect(result.recovered).toBe(true);
    expect(result.reason).toBe('INVALID_SAVED_POSITION');

    expect(result.player.presence.position).toEqual({
      x: DISTRICT_01_SAFE_SPAWN.x,
      y: DISTRICT_01_SAFE_SPAWN.y,
      z: DISTRICT_01_SAFE_SPAWN.z,
    });

    expect(result.player.presence.version).toBe(2);

    const presence = await getPresence(playerId);

    expect(presence.lastRecoveredAt).toBeInstanceOf(Date);
  });

  it('rejects recovery from a valid position', async () => {
    const playerId = await createPlayer(50, 0.08, 29);

    await expect(
      recoveryService.recoverPosition(playerId),
    ).rejects.toMatchObject({ status: 409 });

    const presence = await getPresence(playerId);

    expect(presence.positionX).toBe('50');
    expect(presence.version).toBe(1);
    expect(presence.lastRecoveredAt).toBeNull();
  });

  it('enforces the recovery cooldown', async () => {
    const playerId = await createPlayer(90, -15, 90, new Date());

    await expect(
      recoveryService.recoverPosition(playerId),
    ).rejects.toMatchObject({ status: 409 });

    const presence = await getPresence(playerId);

    expect(presence.version).toBe(1);
    expect(presence.lastRecoveredAt).toBeInstanceOf(Date);
  });

  it('allows recovery after cooldown expiration', async () => {
    const expiredRecovery = new Date(
      Date.now() - (PLAYER_RECOVERY_COOLDOWN_SECONDS + 5) * 1000,
    );

    const playerId = await createPlayer(90, -15, 90, expiredRecovery);

    const result = await recoveryService.recoverPosition(playerId);

    expect(result.recovered).toBe(true);
    expect(result.player.presence.version).toBe(2);
  });

  it('allows only one concurrent recovery', async () => {
    const playerId = await createPlayer(90, -15, 90);

    const results = await Promise.allSettled([
      recoveryService.recoverPosition(playerId),
      recoveryService.recoverPosition(playerId),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const presence = await getPresence(playerId);

    expect(presence.version).toBe(2);
    expect(presence.lastRecoveredAt).toBeInstanceOf(Date);
  });
});
