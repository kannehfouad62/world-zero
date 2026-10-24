import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  requiresDistrict01Recovery,
} from './player.constants.js';
import { PlayerService } from './player.service.js';
import type { PlayerRecoveryResponse } from './player-recovery.types.js';

@Injectable()
export class PlayerRecoveryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly playerService: PlayerService,
  ) {}

  async recoverPosition(playerId: string): Promise<PlayerRecoveryResponse> {
    await this.database.db.transaction(async (tx) => {
      const [presence] = await tx
        .select({
          id: playerWorldPresences.id,
          districtId: playerWorldPresences.districtId,
          positionX: playerWorldPresences.positionX,
          positionY: playerWorldPresences.positionY,
          positionZ: playerWorldPresences.positionZ,
          version: playerWorldPresences.version,
          lastRecoveredAt: playerWorldPresences.lastRecoveredAt,
        })
        .from(playerWorldPresences)
        .where(eq(playerWorldPresences.playerId, playerId))
        .for('update')
        .limit(1);

      if (!presence) {
        throw new NotFoundException('Player world presence was not found');
      }

      const [player] = await tx
        .select({ status: players.status })
        .from(players)
        .where(eq(players.id, playerId))
        .limit(1);

      if (!player || player.status !== 'ACTIVE') {
        throw new ForbiddenException('Player is not eligible for recovery');
      }

      const [district] = await tx
        .select({ slug: districts.slug })
        .from(districts)
        .where(eq(districts.id, presence.districtId))
        .limit(1);

      if (!district || district.slug !== 'district-01') {
        throw new ForbiddenException(
          'Recovery is not configured for this district',
        );
      }

      const position = {
        x: Number(presence.positionX),
        y: Number(presence.positionY),
        z: Number(presence.positionZ),
      };

      if (!requiresDistrict01Recovery(position)) {
        throw new ConflictException(
          'Player position is already within safe boundaries',
        );
      }

      const now = new Date();

      if (presence.lastRecoveredAt) {
        const elapsed =
          (now.getTime() - presence.lastRecoveredAt.getTime()) / 1000;

        if (elapsed < PLAYER_RECOVERY_COOLDOWN_SECONDS) {
          throw new ConflictException('Player recovery cooldown is active');
        }
      }

      await tx
        .update(playerWorldPresences)
        .set({
          positionX: String(DISTRICT_01_SAFE_SPAWN.x),
          positionY: String(DISTRICT_01_SAFE_SPAWN.y),
          positionZ: String(DISTRICT_01_SAFE_SPAWN.z),
          rotationY: String(DISTRICT_01_SAFE_SPAWN.rotationY),
          version: presence.version + 1,
          lastRecoveredAt: now,
          updatedAt: now,
        })
        .where(eq(playerWorldPresences.id, presence.id));
    });

    return {
      recovered: true,
      reason: 'INVALID_SAVED_POSITION',
      player: await this.playerService.getPlayer(playerId),
    };
  }
}
