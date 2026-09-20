import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  players,
  playerWorldPresences,
} from '../database/schema.js';
import { PRIMARY_DISTRICT_SLUG } from '../world/world.constants.js';
import type {
  CreatePlayerInput,
  PlayerResponse,
  UpdatePlayerPositionInput,
} from './player.types.js';
import {
  MAX_MOVEMENT_DISTANCE_PER_UPDATE,
  WORLD_POSITION_LIMIT,
} from './player.constants.js';

@Injectable()
export class PlayerService {
  constructor(private readonly database: DatabaseService) {}

  async createPlayer(input: CreatePlayerInput): Promise<PlayerResponse> {
    const username = input.username.trim().toLowerCase();
    const displayName = input.displayName.trim();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      throw new BadRequestException(
        'Username must be 3-24 characters and contain only letters, numbers, or underscores',
      );
    }

    if (displayName.length < 2 || displayName.length > 40) {
      throw new BadRequestException(
        'Display name must be between 2 and 40 characters',
      );
    }

    const [existingPlayer] = await this.database.db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.username, username))
      .limit(1);

    if (existingPlayer) {
      throw new ConflictException('Username is already in use');
    }

    const [district] = await this.database.db
      .select({
        id: districts.id,
      })
      .from(districts)
      .where(eq(districts.slug, PRIMARY_DISTRICT_SLUG))
      .limit(1);

    if (!district) {
      throw new NotFoundException('Starting district was not found');
    }

    const playerId = await this.database.db.transaction(async (tx) => {
      const [player] = await tx
        .insert(players)
        .values({
          username,
          displayName,
          status: 'ACTIVE',
        })
        .returning({
          id: players.id,
        });

      await tx.insert(playerWorldPresences).values({
        playerId: player.id,
        districtId: district.id,
        positionX: '0',
        positionY: '0',
        positionZ: '0',
        rotationY: '0',
      });

      return player.id;
    });

    return this.getPlayer(playerId);
  }

  async getPlayer(playerId: string): Promise<PlayerResponse> {
    const [result] = await this.database.db
      .select({
        id: players.id,
        username: players.username,
        displayName: players.displayName,
        status: players.status,
        createdAt: players.createdAt,
        lastSeenAt: players.lastSeenAt,

        districtId: districts.id,
        districtName: districts.name,

        positionX: playerWorldPresences.positionX,
        positionY: playerWorldPresences.positionY,
        positionZ: playerWorldPresences.positionZ,
        rotationY: playerWorldPresences.rotationY,

        version: playerWorldPresences.version,
        enteredAt: playerWorldPresences.enteredAt,
        presenceUpdatedAt: playerWorldPresences.updatedAt,
      })
      .from(players)
      .innerJoin(
        playerWorldPresences,
        eq(playerWorldPresences.playerId, players.id),
      )
      .innerJoin(districts, eq(districts.id, playerWorldPresences.districtId))
      .where(eq(players.id, playerId))
      .limit(1);

    if (!result) {
      throw new NotFoundException('Player was not found');
    }

    return {
      id: result.id,
      username: result.username,
      displayName: result.displayName,
      status: result.status,
      createdAt: result.createdAt.toISOString(),
      lastSeenAt: result.lastSeenAt.toISOString(),
      presence: {
        districtId: result.districtId,
        districtName: result.districtName,
        position: {
          x: Number(result.positionX),
          y: Number(result.positionY),
          z: Number(result.positionZ),
        },
        rotationY: Number(result.rotationY),
        version: result.version,
        enteredAt: result.enteredAt.toISOString(),
        updatedAt: result.presenceUpdatedAt.toISOString(),
      },
    };
  }
  async updatePosition(
    playerId: string,
    input: UpdatePlayerPositionInput,
  ): Promise<PlayerResponse> {
    const values = [
      input.position?.x,
      input.position?.y,
      input.position?.z,
      input.rotationY,
    ];

    if (!values.every((value) => Number.isFinite(value))) {
      throw new BadRequestException(
        'Position and rotation must be finite numbers',
      );
    }

    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
      throw new BadRequestException(
        'Expected version must be a positive integer',
      );
    }

    const { x, y, z } = input.position;

    if (
      Math.abs(x) > WORLD_POSITION_LIMIT ||
      Math.abs(y) > WORLD_POSITION_LIMIT ||
      Math.abs(z) > WORLD_POSITION_LIMIT
    ) {
      throw new BadRequestException('Position is outside world boundaries');
    }

    const [current] = await this.database.db
      .select({
        positionX: playerWorldPresences.positionX,
        positionY: playerWorldPresences.positionY,
        positionZ: playerWorldPresences.positionZ,
        version: playerWorldPresences.version,
      })
      .from(playerWorldPresences)
      .where(eq(playerWorldPresences.playerId, playerId))
      .limit(1);

    if (!current) {
      throw new NotFoundException('Player world presence was not found');
    }

    if (current.version !== input.expectedVersion) {
      throw new ConflictException(
        'Player presence changed. Refresh authoritative state and retry.',
      );
    }

    const currentX = Number(current.positionX);
    const currentY = Number(current.positionY);
    const currentZ = Number(current.positionZ);

    const distance = Math.sqrt(
      (x - currentX) ** 2 + (y - currentY) ** 2 + (z - currentZ) ** 2,
    );

    if (distance > MAX_MOVEMENT_DISTANCE_PER_UPDATE) {
      throw new BadRequestException(
        'Movement exceeds the maximum allowed distance',
      );
    }

    const now = new Date();

    const [updated] = await this.database.db
      .update(playerWorldPresences)
      .set({
        positionX: String(x),
        positionY: String(y),
        positionZ: String(z),
        rotationY: String(input.rotationY),
        version: current.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(playerWorldPresences.playerId, playerId),
          eq(playerWorldPresences.version, current.version),
        ),
      )
      .returning({
        id: playerWorldPresences.id,
      });

    if (!updated) {
      throw new ConflictException(
        'Player presence changed during movement processing. Retry from authoritative state.',
      );
    }

    await this.database.db
      .update(players)
      .set({
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(players.id, playerId));

    return this.getPlayer(playerId);
  }
}
