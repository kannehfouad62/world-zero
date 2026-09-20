import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PlayerService } from './player.service.js';
import type {
  CreatePlayerInput,
  PlayerResponse,
  UpdatePlayerPositionInput,
} from './player.types.js';

@Controller('api/v1/players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post()
  async createPlayer(
    @Body() input: CreatePlayerInput,
  ): Promise<PlayerResponse> {
    return this.playerService.createPlayer(input);
  }

  @Get(':playerId')
  async getPlayer(
    @Param('playerId') playerId: string,
  ): Promise<PlayerResponse> {
    return this.playerService.getPlayer(playerId);
  }
  @Patch(':playerId/position')
  async updatePosition(
    @Param('playerId') playerId: string,
    @Body() input: UpdatePlayerPositionInput,
  ): Promise<PlayerResponse> {
    return this.playerService.updatePosition(playerId, input);
  }
}
