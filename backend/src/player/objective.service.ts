import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  eventClues,
  playerClueDiscoveries,
  playerEventDecisions,
  playerEventProgress,
  playerWorldPresences,
  players,
  worldEvents,
} from '../database/schema.js';
import type {
  ClueInspectionResponse,
  PlayerObjectiveResponse,
  PlayerObjectivesResponse,
} from './objective.types.js';

const MAYA_EVENT_SLUG = 'maya-stolen-supplies-01';

const MAYA_OBJECTIVES = [
  "Investigate Maya's Restaurant for evidence.",
  'Follow the clues to the missing supplies.',
  'Recover the stolen supplies.',
  'Return to Maya and report what happened.',
] as const;

const CLUE_INTERACTION_DISTANCE = 3;

@Injectable()
export class ObjectiveService {
  constructor(private readonly database: DatabaseService) {}

  async getActiveObjectives(
    playerId: string,
  ): Promise<PlayerObjectivesResponse> {
    const rows = await this.database.db
      .select({
        id: playerEventProgress.id,
        eventId: worldEvents.id,
        eventSlug: worldEvents.slug,
        title: worldEvents.title,
        description: worldEvents.description,
        status: playerEventProgress.status,
        currentStep: playerEventProgress.currentStep,
        districtId: worldEvents.districtId,
        startedAt: playerEventProgress.startedAt,
        completedAt: playerEventProgress.completedAt,
      })
      .from(playerEventProgress)
      .innerJoin(worldEvents, eq(playerEventProgress.eventId, worldEvents.id))
      .innerJoin(
        playerEventDecisions,
        and(
          eq(playerEventDecisions.eventId, playerEventProgress.eventId),
          eq(playerEventDecisions.playerId, playerEventProgress.playerId),
        ),
      )
      .where(
        and(
          eq(playerEventProgress.playerId, playerId),
          eq(playerEventProgress.status, 'ACTIVE'),
          eq(playerEventDecisions.decision, 'HELP'),
        ),
      );

    const objectives: PlayerObjectiveResponse[] = rows.map((row) => {
      const isMayaEvent = row.eventSlug === MAYA_EVENT_SLUG;

      const totalSteps = isMayaEvent ? MAYA_OBJECTIVES.length : 0;

      const currentObjective =
        isMayaEvent &&
        row.currentStep >= 0 &&
        row.currentStep < MAYA_OBJECTIVES.length
          ? MAYA_OBJECTIVES[row.currentStep]
          : null;

      return {
        id: row.id,
        eventId: row.eventId,
        eventSlug: row.eventSlug,
        title: row.title,
        description: row.description,
        status: row.status,
        currentStep: row.currentStep,
        totalSteps,
        currentObjective,
        districtId: row.districtId,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
      };
    });

    return { objectives };
  }

  async inspectClue(
    playerId: string,
    clueSlug: string,
  ): Promise<ClueInspectionResponse> {
    return this.database.db.transaction(async (tx) => {
      const [clue] = await tx
        .select({
          id: eventClues.id,
          eventId: eventClues.eventId,
          districtId: eventClues.districtId,
          slug: eventClues.slug,
          title: eventClues.title,
          description: eventClues.description,
          positionX: eventClues.positionX,
          positionY: eventClues.positionY,
          positionZ: eventClues.positionZ,
          requiredStep: eventClues.requiredStep,
          isActive: eventClues.isActive,
        })
        .from(eventClues)
        .where(eq(eventClues.slug, clueSlug))
        .limit(1);

      if (!clue || !clue.isActive) {
        throw new NotFoundException('Clue is unavailable');
      }

      const [event] = await tx
        .select({
          id: worldEvents.id,
          slug: worldEvents.slug,
          districtId: worldEvents.districtId,
          status: worldEvents.status,
        })
        .from(worldEvents)
        .where(eq(worldEvents.id, clue.eventId))
        .limit(1);

      if (
        !event ||
        event.slug !== MAYA_EVENT_SLUG ||
        event.status !== 'AVAILABLE' ||
        event.districtId !== clue.districtId
      ) {
        throw new ConflictException(
          'The associated investigation is unavailable',
        );
      }

      // Lock this player's progress row to serialize
      // concurrent clue-inspection requests.
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
          'You must agree to help Maya before investigating',
        );
      }

      if (progress.currentStep !== clue.requiredStep) {
        throw new ConflictException(
          'This clue is not available at your current investigation step',
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
        presence.districtId !== clue.districtId
      ) {
        throw new ForbiddenException(
          'You cannot inspect this clue from your current location',
        );
      }

      const distance = Math.hypot(
        Number(presence.positionX) - Number(clue.positionX),
        Number(presence.positionY) - Number(clue.positionY),
        Number(presence.positionZ) - Number(clue.positionZ),
      );

      if (!Number.isFinite(distance) || distance > CLUE_INTERACTION_DISTANCE) {
        throw new ForbiddenException(
          'You must move closer to inspect the clue',
        );
      }

      const [discovery] = await tx
        .insert(playerClueDiscoveries)
        .values({
          clueId: clue.id,
          eventId: event.id,
          playerId,
        })
        .onConflictDoNothing({
          target: [
            playerClueDiscoveries.playerId,
            playerClueDiscoveries.clueId,
          ],
        })
        .returning({
          id: playerClueDiscoveries.id,
          discoveredAt: playerClueDiscoveries.discoveredAt,
        });

      if (!discovery) {
        throw new ConflictException('You have already discovered this clue');
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
          status: playerEventProgress.status,
          currentStep: playerEventProgress.currentStep,
        });

      if (!updatedProgress || updatedProgress.status !== 'ACTIVE') {
        throw new ConflictException(
          'Investigation progress changed during inspection',
        );
      }

      return {
        clue: {
          id: clue.id,
          slug: clue.slug,
          title: clue.title,
          description: clue.description,
        },
        discovery: {
          id: discovery.id,
          discoveredAt: discovery.discoveredAt.toISOString(),
        },
        progress: {
          status: 'ACTIVE' as const,
          previousStep,
          currentStep: updatedProgress.currentStep,
        },
        message:
          'You discovered evidence connected to Maya’s missing supplies.',
      };
    });
  }
}
