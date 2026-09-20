import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PlayerService } from './player.service.js';
import type { CreatePlayerInput, PlayerResponse } from './player.types.js';

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
}
