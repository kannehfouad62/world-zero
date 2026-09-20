export type WorldStatus = 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';

export interface DistrictSummary {
  id: string;
  name: string;
  city: string;
  status: WorldStatus;
}

export interface WorldClockSummary {
  persistedTick: number;
  effectiveTick: number;
  tickDurationMs: number;
  persistedSimulationTime: string;
  effectiveSimulationTime: string;
  lastProcessedAt: string;
}

export interface WorldStatusResponse {
  worldId: string;
  worldName: string;
  city: string;
  district: DistrictSummary;
  status: WorldStatus;
  serverTime: string;
  worldTime: string;
  worldTick: number;
  clock: WorldClockSummary;
}
