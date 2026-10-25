import { MissionJournalController } from './mission-journal.controller.js';
import { MissionJournalService } from './mission-journal.service.js';
import { Module } from '@nestjs/common';
import { ClueStatusController } from './clue-status.controller.js';
import { MayaDeliveryController } from './maya-delivery.controller.js';
import { MayaDeliveryStatusController } from './maya-delivery-status.controller.js';
import { MayaDeliveryService } from './maya-delivery.service.js';
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
    MayaDeliveryController,
    MayaDeliveryStatusController,
    MissionJournalController,
  ],
  providers: [
    PlayerService,
    ObjectiveService,
    PlayerRecoveryService,
    SupplyRecoveryService,
    MayaDeliveryService,
    MissionJournalService,
  ],
  exports: [
    PlayerService,
    ObjectiveService,
    PlayerRecoveryService,
    SupplyRecoveryService,
    MayaDeliveryService,
    MissionJournalService,
  ],
})
export class PlayerModule {}
