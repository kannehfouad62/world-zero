import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { MissionJournalService } from './mission-journal.service.js';
import type { MissionJournalResponse } from './mission-journal.types.js';

@Controller('api/v1/me')
@UseGuards(AuthGuard)
export class MissionJournalController {
  constructor(private readonly journalService: MissionJournalService) {}

  @Get('mission-journal')
  async getJournal(
    @Req() request: AuthenticatedRequest,
  ): Promise<MissionJournalResponse> {
    const playerId = request.auth?.playerId;

    if (!playerId) {
      throw new UnauthorizedException('Authenticated player was not found');
    }

    return this.journalService.getJournal(playerId);
  }
}
