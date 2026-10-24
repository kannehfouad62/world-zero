import {
  Controller,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import {
  SupplyRecoveryService,
  type SupplyRecoveryResponse,
} from './supply-recovery.service.js';

@Controller('api/v1/me/items')
@UseGuards(AuthGuard)
export class SupplyRecoveryController {
  constructor(private readonly supplyRecoveryService: SupplyRecoveryService) {}

  @Post(':itemSlug/recover')
  async recoverItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemSlug') itemSlug: string,
  ): Promise<SupplyRecoveryResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.supplyRecoveryService.recoverItem(playerId, itemSlug);
  }
}
