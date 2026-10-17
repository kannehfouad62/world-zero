import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  districts,
  locations,
  npcMemories,
  npcs,
  npcPlayerRelationships,
  playerEventDecisions,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import {
  MAYA_HELP_CONSEQUENCES,
  MAYA_SLUG,
  MAYA_STOLEN_SUPPLIES_EVENT_SLUG,
  NPC_INTERACTION_DISTANCE,
} from './npc.constants.js';
import type {
  MayaHelpDecisionInput,
  MayaInteractionResponse,
  NpcRelationshipResponse,
  NpcResponse,
  MayaDecisionStatusResponse,
} from './npc.types.js';

@Injectable()
export class NpcService {
  constructor(private readonly database: DatabaseService) {}

  async getDistrictNpcs(districtSlug: string): Promise<NpcResponse[]> {
    const results = await this.database.db
      .select({
        id: npcs.id,
        slug: npcs.slug,
        firstName: npcs.firstName,
        lastName: npcs.lastName,
        occupation: npcs.occupation,
        status: npcs.status,
        districtId: npcs.districtId,

        locationId: locations.id,
        locationName: locations.name,
        locationSlug: locations.slug,

        positionX: npcs.positionX,
        positionY: npcs.positionY,
        positionZ: npcs.positionZ,

        personality: npcs.personality,
        energy: npcs.energy,
        stress: npcs.stress,
      })
      .from(npcs)
      .innerJoin(districts, eq(districts.id, npcs.districtId))
      .leftJoin(locations, eq(locations.id, npcs.currentLocationId))
      .where(and(eq(districts.slug, districtSlug), eq(npcs.status, 'ACTIVE')));

    return results.map((result) => ({
      id: result.id,
      slug: result.slug,
      firstName: result.firstName,
      lastName: result.lastName,
      occupation: result.occupation,
      status: result.status,
      districtId: result.districtId,

      currentLocation:
        result.locationId && result.locationName && result.locationSlug
          ? {
              id: result.locationId,
              name: result.locationName,
              slug: result.locationSlug,
            }
          : null,

      position: {
        x: Number(result.positionX),
        y: Number(result.positionY),
        z: Number(result.positionZ),
      },

      personality: result.personality,
      energy: result.energy,
      stress: result.stress,
    }));
  }

  async getNpc(npcId: string): Promise<NpcResponse> {
    const [result] = await this.database.db
      .select({
        id: npcs.id,
        slug: npcs.slug,
        firstName: npcs.firstName,
        lastName: npcs.lastName,
        occupation: npcs.occupation,
        status: npcs.status,
        districtId: npcs.districtId,

        locationId: locations.id,
        locationName: locations.name,
        locationSlug: locations.slug,

        positionX: npcs.positionX,
        positionY: npcs.positionY,
        positionZ: npcs.positionZ,

        personality: npcs.personality,
        energy: npcs.energy,
        stress: npcs.stress,
      })
      .from(npcs)
      .leftJoin(locations, eq(locations.id, npcs.currentLocationId))
      .where(eq(npcs.id, npcId))
      .limit(1);

    if (!result) {
      throw new NotFoundException('NPC was not found');
    }

    return {
      id: result.id,
      slug: result.slug,
      firstName: result.firstName,
      lastName: result.lastName,
      occupation: result.occupation,
      status: result.status,
      districtId: result.districtId,

      currentLocation:
        result.locationId && result.locationName && result.locationSlug
          ? {
              id: result.locationId,
              name: result.locationName,
              slug: result.locationSlug,
            }
          : null,

      position: {
        x: Number(result.positionX),
        y: Number(result.positionY),
        z: Number(result.positionZ),
      },

      personality: result.personality,
      energy: result.energy,
      stress: result.stress,
    };
  }

  async getRelationship(
    npcId: string,
    playerId: string,
  ): Promise<NpcRelationshipResponse> {
    const [relationship] = await this.database.db
      .select({
        npcId: npcPlayerRelationships.npcId,
        playerId: npcPlayerRelationships.playerId,
        trust: npcPlayerRelationships.trust,
        familiarity: npcPlayerRelationships.familiarity,
        respect: npcPlayerRelationships.respect,
        resentment: npcPlayerRelationships.resentment,
        lastInteractionAt: npcPlayerRelationships.lastInteractionAt,
      })
      .from(npcPlayerRelationships)
      .where(
        and(
          eq(npcPlayerRelationships.npcId, npcId),
          eq(npcPlayerRelationships.playerId, playerId),
        ),
      )
      .limit(1);

    if (!relationship) {
      throw new NotFoundException('NPC relationship was not found');
    }

    return {
      ...relationship,
      lastInteractionAt: relationship.lastInteractionAt?.toISOString() ?? null,
    };
  }

  async recordMayaHelpDecision(
    playerId: string,
    input: MayaHelpDecisionInput,
  ): Promise<MayaInteractionResponse> {
    if (!input || (input.decision !== 'HELP' && input.decision !== 'REFUSE')) {
      throw new BadRequestException('Invalid Maya decision');
    }

    const now = new Date();

    const result = await this.database.db.transaction(async (tx) => {
      const [event] = await tx
        .select({
          id: worldEvents.id,
          status: worldEvents.status,
          districtId: worldEvents.districtId,
          npcId: worldEvents.npcId,
        })
        .from(worldEvents)
        .where(eq(worldEvents.slug, MAYA_STOLEN_SUPPLIES_EVENT_SLUG))
        .limit(1);

      if (!event) {
        throw new NotFoundException('Maya event was not found');
      }

      const [maya] = await tx
        .select({
          id: npcs.id,
          firstName: npcs.firstName,
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
        maya.status !== 'ACTIVE' ||
        maya.districtId !== event.districtId
      ) {
        throw new ConflictException('Maya is unavailable');
      }

      const [existingDecision] = await tx
        .select()
        .from(playerEventDecisions)
        .where(
          and(
            eq(playerEventDecisions.eventId, event.id),
            eq(playerEventDecisions.playerId, playerId),
          ),
        )
        .limit(1);

      if (existingDecision) {
        throw new ConflictException(
          'You have already made a decision for this event',
        );
      }

      if (event.status !== 'AVAILABLE') {
        throw new ConflictException('This event is no longer available');
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
          'Player is not eligible to interact with Maya',
        );
      }

      const distance = Math.hypot(
        Number(presence.positionX) - Number(maya.positionX),
        Number(presence.positionY) - Number(maya.positionY),
        Number(presence.positionZ) - Number(maya.positionZ),
      );

      if (!Number.isFinite(distance) || distance > NPC_INTERACTION_DISTANCE) {
        throw new ForbiddenException('You must be closer to Maya to interact');
      }

      const [decision] = await tx
        .insert(playerEventDecisions)
        .values({
          eventId: event.id,
          playerId,
          decision: input.decision,
        })
        .onConflictDoNothing({
          target: [playerEventDecisions.eventId, playerEventDecisions.playerId],
        })
        .returning({
          id: playerEventDecisions.id,
        });

      if (!decision) {
        throw new ConflictException(
          'This event decision has already been recorded',
        );
      }

      const consequences = MAYA_HELP_CONSEQUENCES[input.decision];

      const [relationship] = await tx
        .update(npcPlayerRelationships)
        .set({
          trust: sql`${npcPlayerRelationships.trust} + ${consequences.trust}`,
          familiarity: sql`${npcPlayerRelationships.familiarity} + ${consequences.familiarity}`,
          respect: sql`${npcPlayerRelationships.respect} + ${consequences.respect}`,
          resentment: sql`${npcPlayerRelationships.resentment} + ${consequences.resentment}`,
          lastInteractionAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(npcPlayerRelationships.npcId, maya.id),
            eq(npcPlayerRelationships.playerId, playerId),
          ),
        )
        .returning();

      if (!relationship) {
        throw new NotFoundException('Maya relationship was not initialized');
      }

      const summary =
        input.decision === 'HELP'
          ? 'The player agreed to help Maya after supplies were stolen from her restaurant.'
          : 'The player refused to help Maya after supplies were stolen from her restaurant.';

      const [memory] = await tx
        .insert(npcMemories)
        .values({
          npcId: maya.id,
          playerId,
          type: consequences.memoryType,
          summary,
          importance: consequences.memoryImportance,
          occurredAt: now,
        })
        .returning();

      if (!memory) {
        throw new Error('NPC memory creation failed');
      }

      return { maya, relationship, memory };
    });

    return {
      npc: {
        id: result.maya.id,
        name: result.maya.firstName,
      },
      decision: input.decision,
      message:
        input.decision === 'HELP'
          ? 'Maya appreciates that you agreed to help.'
          : 'Maya remembers that you refused to help.',
      relationship: {
        npcId: result.relationship.npcId,
        playerId: result.relationship.playerId,
        trust: result.relationship.trust,
        familiarity: result.relationship.familiarity,
        respect: result.relationship.respect,
        resentment: result.relationship.resentment,
        lastInteractionAt:
          result.relationship.lastInteractionAt?.toISOString() ?? null,
      },
      memory: {
        id: result.memory.id,
        type: result.memory.type,
        summary: result.memory.summary,
        importance: result.memory.importance,
        occurredAt: result.memory.occurredAt.toISOString(),
      },
    };
  }

  async getMayaDecisionStatus(
    playerId: string,
  ): Promise<MayaDecisionStatusResponse> {
    const [event] = await this.database.db
      .select({
        id: worldEvents.id,
        slug: worldEvents.slug,
        status: worldEvents.status,
      })
      .from(worldEvents)
      .where(eq(worldEvents.slug, MAYA_STOLEN_SUPPLIES_EVENT_SLUG))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Maya event was not found');
    }

    const [recorded] = await this.database.db
      .select({
        decision: playerEventDecisions.decision,
        createdAt: playerEventDecisions.createdAt,
      })
      .from(playerEventDecisions)
      .where(
        and(
          eq(playerEventDecisions.eventId, event.id),
          eq(playerEventDecisions.playerId, playerId),
        ),
      )
      .limit(1);

    return {
      eventId: event.id,
      eventSlug: event.slug,
      eventStatus: event.status,
      hasDecided: Boolean(recorded),
      decision: recorded?.decision ?? null,
      decidedAt: recorded?.createdAt.toISOString() ?? null,
    };
  }
}
