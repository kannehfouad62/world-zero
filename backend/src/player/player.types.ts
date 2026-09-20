export type PlayerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
}

export interface PlayerWorldPresenceResponse {
  districtId: string;
  districtName: string;
  position: PlayerPosition;
  rotationY: number;
  version: number;
  enteredAt: string;
  updatedAt: string;
}

export interface PlayerResponse {
  id: string;
  username: string;
  displayName: string;
  status: PlayerStatus;
  createdAt: string;
  lastSeenAt: string;
  presence: PlayerWorldPresenceResponse;
}

export interface CreatePlayerInput {
  username: string;
  displayName: string;
}

export interface UpdatePlayerPositionInput {
  position: PlayerPosition;
  rotationY: number;
  expectedVersion: number;
}
