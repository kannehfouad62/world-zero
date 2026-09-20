import { Controller, Get } from '@nestjs/common';
import { WorldService } from './world.service.js';
import type { WorldStatusResponse } from './world.types.js';

@Controller('api/v1/world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get('status')
  async getWorldStatus(): Promise<WorldStatusResponse> {
    return this.worldService.getWorldStatus();
  }
}
