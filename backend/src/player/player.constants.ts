export const MAX_MOVEMENT_DISTANCE_PER_UPDATE = 25;

export const WORLD_POSITION_LIMIT = 100_000;

export const DISTRICT_01_BOUNDS = {
  minX: -65,
  maxX: 65,
  minZ: -65,
  maxZ: 65,
  minY: -1,
  maxY: 10,
} as const;

export const DISTRICT_01_SAFE_SPAWN = {
  x: -27.5,
  y: 0.08,
  z: 14.4,
  rotationY: 0,
} as const;

export function isWithinDistrict01Bounds(position: {
  x: number;
  y: number;
  z: number;
}): boolean {
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z) &&
    position.x >= DISTRICT_01_BOUNDS.minX &&
    position.x <= DISTRICT_01_BOUNDS.maxX &&
    position.y >= DISTRICT_01_BOUNDS.minY &&
    position.y <= DISTRICT_01_BOUNDS.maxY &&
    position.z >= DISTRICT_01_BOUNDS.minZ &&
    position.z <= DISTRICT_01_BOUNDS.maxZ
  );
}

export const PLAYER_RECOVERY_COOLDOWN_SECONDS = 30;

export function requiresDistrict01Recovery(position: {
  x: number;
  y: number;
  z: number;
}): boolean {
  return !isWithinDistrict01Bounds(position);
}
