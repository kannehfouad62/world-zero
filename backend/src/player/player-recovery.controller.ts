import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PlayerRecoveryService } from './player-recovery.service.js';
import type { PlayerRecoveryResponse } from './player-recovery.types.js';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class PlayerRecoveryController {
  constructor(private readonly recoveryService: PlayerRecoveryService) {}

  @Post('recover-position')
  async recoverPosition(
    @Req() request: AuthenticatedRequest,
  ): Promise<PlayerRecoveryResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.recoveryService.recoverPosition(playerId);
  }
}
