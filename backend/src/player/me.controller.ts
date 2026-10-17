import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { ObjectiveService } from './objective.service.js';
import type {
  ClueInspectionResponse,
  PlayerObjectivesResponse,
} from './objective.types.js';
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

  @Post('clues/:clueSlug/inspect')
  async inspectClue(
    @Req() request: AuthenticatedRequest,
    @Param('clueSlug') clueSlug: string,
  ): Promise<ClueInspectionResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.objectiveService.inspectClue(playerId, clueSlug);
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
