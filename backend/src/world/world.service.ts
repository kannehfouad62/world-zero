import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { cities, districts, worlds } from '../database/schema.js';
import {
  PRIMARY_DISTRICT_SLUG,
  WORLD_SLUG,
  WORLD_TICK_DURATION_MS,
} from './world.constants.js';
import type { WorldStatusResponse } from './world.types.js';

@Injectable()
export class WorldService {
  constructor(private readonly database: DatabaseService) {}

  async getWorldStatus(): Promise<WorldStatusResponse> {
    const [result] = await this.database.db
      .select({
        worldId: worlds.id,
        worldName: worlds.name,
        worldStatus: worlds.status,
        persistedTick: worlds.tick,
        persistedSimulationTime: worlds.simulationTime,
        lastProcessedAt: worlds.lastProcessedAt,
        cityName: cities.name,
        districtId: districts.id,
        districtName: districts.name,
        districtStatus: districts.status,
      })
      .from(worlds)
      .innerJoin(cities, eq(cities.worldId, worlds.id))
      .innerJoin(
        districts,
        and(
          eq(districts.cityId, cities.id),
          eq(districts.slug, PRIMARY_DISTRICT_SLUG),
        ),
      )
      .where(eq(worlds.slug, WORLD_SLUG))
      .limit(1);

    if (!result) {
      throw new NotFoundException('WORLD ZERO world state was not found');
    }

    const now = new Date();

    const elapsedMs = Math.max(
      0,
      now.getTime() - result.lastProcessedAt.getTime(),
    );

    const elapsedTicks = Math.floor(elapsedMs / WORLD_TICK_DURATION_MS);

    const effectiveTick = result.persistedTick + elapsedTicks;

    const effectiveSimulationTime = new Date(
      result.persistedSimulationTime.getTime() +
        elapsedTicks * WORLD_TICK_DURATION_MS,
    );

    return {
      worldId: result.worldId,
      worldName: result.worldName,
      city: result.cityName,
      district: {
        id: result.districtId,
        name: result.districtName,
        city: result.cityName,
        status: result.districtStatus,
      },
      status: result.worldStatus,
      serverTime: now.toISOString(),
      worldTime: effectiveSimulationTime.toISOString(),
      worldTick: effectiveTick,
      clock: {
        persistedTick: result.persistedTick,
        effectiveTick,
        tickDurationMs: WORLD_TICK_DURATION_MS,
        persistedSimulationTime: result.persistedSimulationTime.toISOString(),
        effectiveSimulationTime: effectiveSimulationTime.toISOString(),
        lastProcessedAt: result.lastProcessedAt.toISOString(),
      },
    };
  }
}
