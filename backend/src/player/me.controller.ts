import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PlayerService } from './player.service.js';
import type {
  PlayerResponse,
  UpdatePlayerPositionInput,
} from './player.types.js';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly playerService: PlayerService) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<PlayerResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.playerService.getPlayer(playerId);
  }

  @Patch('position')
  async updatePosition(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdatePlayerPositionInput,
  ): Promise<PlayerResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.playerService.updatePosition(playerId, input);
  }
}
