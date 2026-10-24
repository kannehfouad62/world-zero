import {
  Controller,
  Get,
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

export interface MayaDeliveryStatusResponse {
  eventSlug: string;
  status: string | null;
  currentStep: number | null;
  hasRecoveredSupplies: boolean;
  canDeliver: boolean;
  completed: boolean;
  completedAt: string | null;
}

@Controller('api/v1/me/maya')
@UseGuards(AuthGuard)
export class MayaDeliveryStatusController {
  constructor(private readonly database: DatabaseService) {}

  @Get('delivery-status')
  async getDeliveryStatus(
    @Req() request: AuthenticatedRequest,
  ): Promise<MayaDeliveryStatusResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    const eventSlug = 'maya-stolen-supplies-01';

    const [event] = await this.database.db
      .select({
        id: worldEvents.id,
        status: worldEvents.status,
      })
      .from(worldEvents)
      .where(eq(worldEvents.slug, eventSlug))
      .limit(1);

    if (!event) {
      return {
        eventSlug,
        status: null,
        currentStep: null,
        hasRecoveredSupplies: false,
        canDeliver: false,
        completed: false,
        completedAt: null,
      };
    }

    const [progress] = await this.database.db
      .select({
        status: playerEventProgress.status,
        currentStep: playerEventProgress.currentStep,
        completedAt: playerEventProgress.completedAt,
      })
      .from(playerEventProgress)
      .where(
        and(
          eq(playerEventProgress.eventId, event.id),
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
          eq(playerEventDecisions.eventId, event.id),
          eq(playerEventDecisions.playerId, playerId),
        ),
      )
      .limit(1);

    const [recovery] = await this.database.db
      .select({
        id: playerRecoveredItems.id,
      })
      .from(playerRecoveredItems)
      .innerJoin(
        eventRecoverableItems,
        eq(playerRecoveredItems.itemId, eventRecoverableItems.id),
      )
      .where(
        and(
          eq(playerRecoveredItems.eventId, event.id),
          eq(playerRecoveredItems.playerId, playerId),
          eq(eventRecoverableItems.slug, 'maya-stolen-supply-crate'),
        ),
      )
      .limit(1);

    const hasRecoveredSupplies = Boolean(recovery);

    const completed =
      progress?.status === 'COMPLETED' && progress.currentStep === 4;

    const canDeliver =
      event.status === 'AVAILABLE' &&
      progress?.status === 'ACTIVE' &&
      progress.currentStep === 3 &&
      decision?.decision === 'HELP' &&
      hasRecoveredSupplies;

    return {
      eventSlug,
      status: progress?.status ?? null,
      currentStep: progress?.currentStep ?? null,
      hasRecoveredSupplies,
      canDeliver,
      completed,
      completedAt: progress?.completedAt?.toISOString() ?? null,
    };
  }
}
