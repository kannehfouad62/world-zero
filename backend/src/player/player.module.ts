import { Module } from '@nestjs/common';
import { ClueStatusController } from './clue-status.controller.js';
import { MeController } from './me.controller.js';
import { ObjectiveService } from './objective.service.js';
import { PlayerController } from './player.controller.js';
import { PlayerRecoveryController } from './player-recovery.controller.js';
import { PlayerRecoveryService } from './player-recovery.service.js';
import { PlayerService } from './player.service.js';

@Module({
  controllers: [
    PlayerController,
    MeController,
    ClueStatusController,
    PlayerRecoveryController,
  ],
  providers: [PlayerService, ObjectiveService, PlayerRecoveryService],
  exports: [PlayerService, ObjectiveService, PlayerRecoveryService],
})
export class PlayerModule {}
