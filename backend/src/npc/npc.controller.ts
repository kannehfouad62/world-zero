import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { NpcService } from './npc.service.js';
import type {
  MayaHelpDecisionInput,
  MayaInteractionResponse,
  NpcResponse,
  MayaDecisionStatusResponse,
} from './npc.types.js';

@Controller('api/v1/npcs')
export class NpcController {
  constructor(private readonly npcService: NpcService) {}

  @Get('district/:districtSlug')
  async getDistrictNpcs(
    @Param('districtSlug') districtSlug: string,
  ): Promise<NpcResponse[]> {
    return this.npcService.getDistrictNpcs(districtSlug);
  }

  @Post('maya/help-decision')
  @UseGuards(AuthGuard)
  async recordMayaHelpDecision(
    @Req() request: AuthenticatedRequest,
    @Body() input: MayaHelpDecisionInput,
  ): Promise<MayaInteractionResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.npcService.recordMayaHelpDecision(playerId, input);
  }

  @Get(':npcId')
  async getNpc(@Param('npcId') npcId: string): Promise<NpcResponse> {
    return this.npcService.getNpc(npcId);
  }

  @Get('maya/decision-status')
  @UseGuards(AuthGuard)
  async getMayaDecisionStatus(
    @Req() request: AuthenticatedRequest,
  ): Promise<MayaDecisionStatusResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.npcService.getMayaDecisionStatus(playerId);
  }
}
