import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  eventRecoverableItems,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';

const MAYA_EVENT_SLUG = 'maya-stolen-supplies-01';
const SUPPLY_RECOVERY_DISTANCE = 3;

export interface SupplyRecoveryResponse {
  item: {
    id: string;
    slug: string;
    name: string;
    description: string;
  };
  recovery: {
    id: string;
    recoveredAt: string;
  };
  progress: {
    status: 'ACTIVE';
    previousStep: number;
    currentStep: number;
  };
  message: string;
}

@Injectable()
export class SupplyRecoveryService {
  constructor(private readonly database: DatabaseService) {}

  async recoverItem(
    playerId: string,
    itemSlug: string,
  ): Promise<SupplyRecoveryResponse> {
    return this.database.db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(eventRecoverableItems)
        .where(eq(eventRecoverableItems.slug, itemSlug))
        .limit(1);

      if (!item || !item.isActive) {
        throw new NotFoundException('Recoverable item is unavailable');
      }

      const [event] = await tx
        .select({
          id: worldEvents.id,
          slug: worldEvents.slug,
          districtId: worldEvents.districtId,
          status: worldEvents.status,
        })
        .from(worldEvents)
        .where(eq(worldEvents.id, item.eventId))
        .limit(1);

      if (
        !event ||
        event.slug !== MAYA_EVENT_SLUG ||
        event.status !== 'AVAILABLE' ||
        event.districtId !== item.districtId
      ) {
        throw new ConflictException(
          'The associated world event is unavailable',
        );
      }

      // Serialize interactions for this player and event.
      const [progress] = await tx
        .select({
          id: playerEventProgress.id,
          status: playerEventProgress.status,
          currentStep: playerEventProgress.currentStep,
        })
        .from(playerEventProgress)
        .where(
          and(
            eq(playerEventProgress.eventId, event.id),
            eq(playerEventProgress.playerId, playerId),
          ),
        )
        .for('update')
        .limit(1);

      if (!progress || progress.status !== 'ACTIVE') {
        throw new ForbiddenException('You do not have an active investigation');
      }

      const [decision] = await tx
        .select({
          decision: playerEventDecisions.decision,
        })
        .from(playerEventDecisions)
        .where(
          and(
            eq(playerEventDecisions.eventId, event.id),
            eq(playerEventDecisions.playerId, playerId),
          ),
        )
        .limit(1);

      if (!decision || decision.decision !== 'HELP') {
        throw new ForbiddenException(
          'You must agree to help Maya before recovering supplies',
        );
      }

      if (progress.currentStep !== item.requiredStep) {
        throw new ConflictException(
          'Supplies cannot be recovered at your current investigation step',
        );
      }

      const [presence] = await tx
        .select({
          districtId: playerWorldPresences.districtId,
          positionX: playerWorldPresences.positionX,
          positionY: playerWorldPresences.positionY,
          positionZ: playerWorldPresences.positionZ,
          playerStatus: players.status,
        })
        .from(playerWorldPresences)
        .innerJoin(players, eq(players.id, playerWorldPresences.playerId))
        .where(eq(playerWorldPresences.playerId, playerId))
        .limit(1);

      if (
        !presence ||
        presence.playerStatus !== 'ACTIVE' ||
        presence.districtId !== item.districtId
      ) {
        throw new ForbiddenException(
          'You cannot recover supplies from your current location',
        );
      }

      const distance = Math.hypot(
        Number(presence.positionX) - Number(item.positionX),
        Number(presence.positionY) - Number(item.positionY),
        Number(presence.positionZ) - Number(item.positionZ),
      );

      if (!Number.isFinite(distance) || distance > SUPPLY_RECOVERY_DISTANCE) {
        throw new ForbiddenException(
          'You must move closer to recover the supplies',
        );
      }

      const [recovery] = await tx
        .insert(playerRecoveredItems)
        .values({
          itemId: item.id,
          eventId: event.id,
          playerId,
        })
        .onConflictDoNothing({
          target: [playerRecoveredItems.playerId, playerRecoveredItems.itemId],
        })
        .returning({
          id: playerRecoveredItems.id,
          recoveredAt: playerRecoveredItems.recoveredAt,
        });

      if (!recovery) {
        throw new ConflictException(
          'You have already recovered these supplies',
        );
      }

      const previousStep = progress.currentStep;

      const [updatedProgress] = await tx
        .update(playerEventProgress)
        .set({
          currentStep: sql`${playerEventProgress.currentStep} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(playerEventProgress.id, progress.id),
            eq(playerEventProgress.status, 'ACTIVE'),
            eq(playerEventProgress.currentStep, previousStep),
          ),
        )
        .returning({
          currentStep: playerEventProgress.currentStep,
          status: playerEventProgress.status,
        });

      if (
        !updatedProgress ||
        updatedProgress.status !== 'ACTIVE' ||
        updatedProgress.currentStep !== previousStep + 1
      ) {
        throw new ConflictException(
          'Investigation progress changed during supply recovery',
        );
      }

      return {
        item: {
          id: item.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
        },
        recovery: {
          id: recovery.id,
          recoveredAt: recovery.recoveredAt.toISOString(),
        },
        progress: {
          status: 'ACTIVE' as const,
          previousStep,
          currentStep: updatedProgress.currentStep,
        },
        message:
          'You recovered Maya’s stolen supplies. Return to her restaurant.',
      };
    });
  }
}
