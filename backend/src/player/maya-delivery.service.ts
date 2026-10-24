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
import {
  MAYA_SLUG,
  MAYA_STOLEN_SUPPLIES_EVENT_SLUG,
  NPC_INTERACTION_DISTANCE,
} from '../npc/npc.constants.js';

const SUPPLY_SLUG = 'maya-stolen-supply-crate';

const DELIVERY_REWARD = {
  trust: 20,
  familiarity: 5,
  respect: 15,
  resentment: 0,
} as const;

export interface MayaDeliveryResponse {
  eventId: string;
  eventSlug: string;
  status: 'COMPLETED';
  previousStep: number;
  currentStep: number;
  completedAt: string;
  message: string;
  relationship: {
    trust: number;
    familiarity: number;
    respect: number;
    resentment: number;
  };
  memory: {
    id: string;
    type: string;
    summary: string;
    importance: number;
  };
}

@Injectable()
export class MayaDeliveryService {
  constructor(private readonly database: DatabaseService) {}

  async deliverSupplies(playerId: string): Promise<MayaDeliveryResponse> {
    return this.database.db.transaction(async (tx) => {
      const [event] = await tx
        .select({
          id: worldEvents.id,
          slug: worldEvents.slug,
          districtId: worldEvents.districtId,
          npcId: worldEvents.npcId,
          status: worldEvents.status,
        })
        .from(worldEvents)
        .where(eq(worldEvents.slug, MAYA_STOLEN_SUPPLIES_EVENT_SLUG))
        .limit(1);

      if (!event || event.status !== 'AVAILABLE') {
        throw new ConflictException('Maya investigation is unavailable');
      }

      // Lock player-specific progress before checking
      // eligibility or applying any consequences.
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

      if (!progress) {
        throw new ForbiddenException('You do not have this investigation');
      }

      if (progress.status !== 'ACTIVE' || progress.currentStep !== 3) {
        throw new ConflictException(
          'This investigation cannot be completed at the current step',
        );
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
        throw new ForbiddenException('You must have agreed to help Maya');
      }

      const [item] = await tx
        .select({
          id: eventRecoverableItems.id,
          districtId: eventRecoverableItems.districtId,
        })
        .from(eventRecoverableItems)
        .where(
          and(
            eq(eventRecoverableItems.slug, SUPPLY_SLUG),
            eq(eventRecoverableItems.eventId, event.id),
          ),
        )
        .limit(1);

      if (!item || item.districtId !== event.districtId) {
        throw new NotFoundException('Maya supply item was not found');
      }

      const [recovery] = await tx
        .select({
          id: playerRecoveredItems.id,
        })
        .from(playerRecoveredItems)
        .where(
          and(
            eq(playerRecoveredItems.itemId, item.id),
            eq(playerRecoveredItems.eventId, event.id),
            eq(playerRecoveredItems.playerId, playerId),
          ),
        )
        .limit(1);

      if (!recovery) {
        throw new ForbiddenException(
          'You must recover the supplies before returning them',
        );
      }

      const [maya] = await tx
        .select({
          id: npcs.id,
          slug: npcs.slug,
          status: npcs.status,
          districtId: npcs.districtId,
          positionX: npcs.positionX,
          positionY: npcs.positionY,
          positionZ: npcs.positionZ,
        })
        .from(npcs)
        .where(eq(npcs.id, event.npcId))
        .limit(1);

      if (
        !maya ||
        maya.slug !== MAYA_SLUG ||
        maya.status !== 'ACTIVE' ||
        maya.districtId !== event.districtId
      ) {
        throw new ConflictException('Maya is unavailable');
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
        presence.districtId !== event.districtId
      ) {
        throw new ForbiddenException(
          'Player cannot deliver supplies from this location',
        );
      }

      const distance = Math.hypot(
        Number(presence.positionX) - Number(maya.positionX),
        Number(presence.positionY) - Number(maya.positionY),
        Number(presence.positionZ) - Number(maya.positionZ),
      );

      if (!Number.isFinite(distance) || distance > NPC_INTERACTION_DISTANCE) {
        throw new ForbiddenException(
          'You must be closer to Maya to deliver supplies',
        );
      }

      const now = new Date();

      const [updatedProgress] = await tx
        .update(playerEventProgress)
        .set({
          currentStep: 4,
          status: 'COMPLETED',
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(playerEventProgress.id, progress.id),
            eq(playerEventProgress.status, 'ACTIVE'),
            eq(playerEventProgress.currentStep, 3),
          ),
        )
        .returning({
          currentStep: playerEventProgress.currentStep,
          status: playerEventProgress.status,
          completedAt: playerEventProgress.completedAt,
        });

      if (
        !updatedProgress ||
        updatedProgress.status !== 'COMPLETED' ||
        updatedProgress.currentStep !== 4 ||
        !updatedProgress.completedAt
      ) {
        throw new ConflictException('Investigation completion failed');
      }

      const [relationship] = await tx
        .update(npcPlayerRelationships)
        .set({
          trust: sql`${npcPlayerRelationships.trust} + ${DELIVERY_REWARD.trust}`,
          familiarity: sql`${npcPlayerRelationships.familiarity} + ${DELIVERY_REWARD.familiarity}`,
          respect: sql`${npcPlayerRelationships.respect} + ${DELIVERY_REWARD.respect}`,
          resentment: sql`${npcPlayerRelationships.resentment} + ${DELIVERY_REWARD.resentment}`,
          lastInteractionAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(npcPlayerRelationships.npcId, maya.id),
            eq(npcPlayerRelationships.playerId, playerId),
          ),
        )
        .returning({
          trust: npcPlayerRelationships.trust,
          familiarity: npcPlayerRelationships.familiarity,
          respect: npcPlayerRelationships.respect,
          resentment: npcPlayerRelationships.resentment,
        });

      if (!relationship) {
        throw new NotFoundException('Maya relationship was not initialized');
      }

      const summary =
        'The player recovered Maya’s stolen restaurant supplies and returned them, fulfilling the promise to help her.';

      const [memory] = await tx
        .insert(npcMemories)
        .values({
          npcId: maya.id,
          playerId,
          type: 'HELP',
          summary,
          importance: 90,
          occurredAt: now,
        })
        .returning({
          id: npcMemories.id,
          type: npcMemories.type,
          summary: npcMemories.summary,
          importance: npcMemories.importance,
        });

      if (!memory) {
        throw new Error('Maya completion memory was not created');
      }

      return {
        eventId: event.id,
        eventSlug: event.slug,
        status: 'COMPLETED' as const,
        previousStep: 3,
        currentStep: updatedProgress.currentStep,
        completedAt: updatedProgress.completedAt.toISOString(),
        message:
          'Thank you for bringing my supplies back. You kept your promise, and I will remember that.',
        relationship,
        memory,
      };
    });
  }
}
