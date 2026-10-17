import { Module } from '@nestjs/common';
import { NpcController } from './npc.controller.js';
import { NpcService } from './npc.service.js';

@Module({
  controllers: [NpcController],
  providers: [NpcService],
  exports: [NpcService],
})
export class NpcModule {}
