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
import { ObjectiveService } from './objective.service.js';
import type { PlayerObjectivesResponse } from './objective.types.js';
import { PlayerService } from './player.service.js';
import type {
  PlayerResponse,
  UpdatePlayerPositionInput,
} from './player.types.js';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly objectiveService: ObjectiveService,
  ) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<PlayerResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.playerService.getPlayer(playerId);
  }

  @Get('objectives')
  async getObjectives(
    @Req() request: AuthenticatedRequest,
  ): Promise<PlayerObjectivesResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.objectiveService.getActiveObjectives(playerId);
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
