import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  playerEventDecisions,
  playerEventProgress,
  worldEvents,
} from '../database/schema.js';
import type {
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
}
