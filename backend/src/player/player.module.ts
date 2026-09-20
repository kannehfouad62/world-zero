import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';

@Module({
  controllers: [PlayerController, MeController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
