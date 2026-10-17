import { Module } from '@nestjs/common';
import { ClueStatusController } from './clue-status.controller.js';
import { MeController } from './me.controller.js';
import { ObjectiveService } from './objective.service.js';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';

@Module({
  controllers: [PlayerController, MeController, ClueStatusController],
  providers: [PlayerService, ObjectiveService],
  exports: [PlayerService, ObjectiveService],
})
export class PlayerModule {}
