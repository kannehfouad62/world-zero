import { Module } from '@nestjs/common';
import { ClueStatusController } from './clue-status.controller.js';
import { MeController } from './me.controller.js';
import { ObjectiveService } from './objective.service.js';
import { PlayerController } from './player.controller.js';
import { PlayerRecoveryController } from './player-recovery.controller.js';
import { PlayerRecoveryService } from './player-recovery.service.js';
import { PlayerService } from './player.service.js';
import { SupplyRecoveryController } from './supply-recovery.controller.js';
import { SupplyRecoveryService } from './supply-recovery.service.js';
import { SupplyStatusController } from './supply-status.controller.js';

@Module({
  controllers: [
    PlayerController,
    MeController,
    ClueStatusController,
    PlayerRecoveryController,
    SupplyRecoveryController,
    SupplyStatusController,
  ],
  providers: [
    PlayerService,
    ObjectiveService,
    PlayerRecoveryService,
    SupplyRecoveryService,
  ],
  exports: [
    PlayerService,
    ObjectiveService,
    PlayerRecoveryService,
    SupplyRecoveryService,
  ],
})
export class PlayerModule {}
