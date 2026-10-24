import type { PlayerResponse } from './player.types.js';

export interface PlayerRecoveryResponse {
  recovered: boolean;
  reason: string;
  player: PlayerResponse;
}
