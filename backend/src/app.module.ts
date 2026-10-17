import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { PlayerModule } from './player/player.module.js';
import { WorldModule } from './world/world.module.js';
import { AuthModule } from './auth/auth.module.js';
import { NpcModule } from './npc/npc.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    WorldModule,
    PlayerModule,
    AuthModule,
    NpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
