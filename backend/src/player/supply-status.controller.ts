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
  eventRecoverableItems,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  worldEvents,
} from '../database/schema.js';

export interface SupplyStatusResponse {
  available: boolean;
  recovered: boolean;
  recoveredAt: string | null;
  currentStep: number | null;
  canRecover: boolean;
}

@Controller('api/v1/me/items')
@UseGuards(AuthGuard)
export class SupplyStatusController {
  constructor(private readonly database: DatabaseService) {}

  @Get(':itemSlug/status')
  async getStatus(
    @Req() request: AuthenticatedRequest,
    @Param('itemSlug') itemSlug: string,
  ): Promise<SupplyStatusResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    const [item] = await this.database.db
      .select({
        id: eventRecoverableItems.id,
        eventId: eventRecoverableItems.eventId,
        requiredStep: eventRecoverableItems.requiredStep,
        isActive: eventRecoverableItems.isActive,
        eventStatus: worldEvents.status,
        eventSlug: worldEvents.slug,
      })
      .from(eventRecoverableItems)
      .innerJoin(worldEvents, eq(eventRecoverableItems.eventId, worldEvents.id))
      .where(eq(eventRecoverableItems.slug, itemSlug))
      .limit(1);

    if (!item) {
      return {
        available: false,
        recovered: false,
        recoveredAt: null,
        currentStep: null,
        canRecover: false,
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
          eq(playerEventProgress.eventId, item.eventId),
          eq(playerEventProgress.playerId, playerId),
        ),
      )
      .limit(1);

    const [decision] = await this.database.db
      .select({
        decision: playerEventDecisions.decision,
      })
      .from(playerEventDecisions)
      .where(
        and(
          eq(playerEventDecisions.eventId, item.eventId),
          eq(playerEventDecisions.playerId, playerId),
        ),
      )
      .limit(1);

    const [recovery] = await this.database.db
      .select({
        recoveredAt: playerRecoveredItems.recoveredAt,
      })
      .from(playerRecoveredItems)
      .where(
        and(
          eq(playerRecoveredItems.itemId, item.id),
          eq(playerRecoveredItems.playerId, playerId),
        ),
      )
      .limit(1);

    const available =
      item.isActive &&
      item.eventStatus === 'AVAILABLE' &&
      item.eventSlug === 'maya-stolen-supplies-01';

    const recovered = Boolean(recovery);

    const canRecover =
      available &&
      !recovered &&
      progress?.status === 'ACTIVE' &&
      progress.currentStep === item.requiredStep &&
      decision?.decision === 'HELP';

    return {
      available,
      recovered,
      recoveredAt: recovery?.recoveredAt.toISOString() ?? null,
      currentStep: progress?.currentStep ?? null,
      canRecover,
    };
  }
}
