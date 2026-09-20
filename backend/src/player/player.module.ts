import { Module } from '@nestjs/common';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';

@Module({
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
