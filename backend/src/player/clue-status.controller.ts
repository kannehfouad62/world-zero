import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { DatabaseService } from '../database/database.service.js';
import {
  eventClues,
  playerClueDiscoveries,
  playerEventProgress,
  worldEvents,
} from '../database/schema.js';

@Controller('api/v1/me/clues')
@UseGuards(AuthGuard)
export class ClueStatusController {
  constructor(private readonly database: DatabaseService) {}

  @Get(':clueSlug/status')
  async getClueStatus(
    @Req() request: AuthenticatedRequest,
    @Param('clueSlug') clueSlug: string,
  ) {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    const [clue] = await this.database.db
      .select({
        id: eventClues.id,
        slug: eventClues.slug,
        eventId: eventClues.eventId,
        requiredStep: eventClues.requiredStep,
        isActive: eventClues.isActive,
      })
      .from(eventClues)
      .innerJoin(worldEvents, eq(worldEvents.id, eventClues.eventId))
      .where(
        and(
          eq(eventClues.slug, clueSlug),
          eq(worldEvents.slug, 'maya-stolen-supplies-01'),
        ),
      )
      .limit(1);

    // Avoid exposing whether an unknown or inactive clue exists.
    if (!clue || !clue.isActive) {
      return {
        available: false,
        discovered: false,
        currentStep: null,
        canInspect: false,
      };
    }

    const [progress] = await this.database.db
      .select({
        status: playerEventProgress.status,
        currentStep: playerEventProgress.currentStep,
      })
      .from(playerEventProgress)
      .where(
        and(
          eq(playerEventProgress.eventId, clue.eventId),
          eq(playerEventProgress.playerId, playerId),
        ),
      )
      .limit(1);

    const [discovery] = await this.database.db
      .select({
        id: playerClueDiscoveries.id,
        discoveredAt: playerClueDiscoveries.discoveredAt,
      })
      .from(playerClueDiscoveries)
      .where(
        and(
          eq(playerClueDiscoveries.clueId, clue.id),
          eq(playerClueDiscoveries.eventId, clue.eventId),
          eq(playerClueDiscoveries.playerId, playerId),
        ),
      )
      .limit(1);

    return {
      available: true,
      discovered: Boolean(discovery),
      discoveredAt: discovery?.discoveredAt.toISOString() ?? null,
      currentStep: progress?.currentStep ?? null,
      canInspect:
        !discovery &&
        progress?.status === 'ACTIVE' &&
        progress.currentStep === clue.requiredStep,
    };
  }
}
