import { describe, expect, it } from 'vitest';
import {
  DISTRICT_01_BOUNDS,
  isWithinDistrict01Bounds,
} from './player.constants.js';

describe('District 01 playable boundaries', () => {
  it('accepts valid positions inside District 01', () => {
    expect(
      isWithinDistrict01Bounds({
        x: -27.5,
        y: 0.08,
        z: 14.4,
      }),
    ).toBe(true);

    expect(
      isWithinDistrict01Bounds({
        x: 50,
        y: 0,
        z: 29,
      }),
    ).toBe(true);
  });

  it('rejects positions beyond the horizontal boundaries', () => {
    expect(
      isWithinDistrict01Bounds({
        x: DISTRICT_01_BOUNDS.maxX + 1,
        y: 0,
        z: 0,
      }),
    ).toBe(false);

    expect(
      isWithinDistrict01Bounds({
        x: 0,
        y: 0,
        z: DISTRICT_01_BOUNDS.minZ - 1,
      }),
    ).toBe(false);
  });

  it('rejects positions below the playable ground', () => {
    expect(
      isWithinDistrict01Bounds({
        x: 0,
        y: -10,
        z: 0,
      }),
    ).toBe(false);
  });

  it('rejects non-finite coordinates', () => {
    expect(
      isWithinDistrict01Bounds({
        x: Number.NaN,
        y: 0,
        z: 0,
      }),
    ).toBe(false);

    expect(
      isWithinDistrict01Bounds({
        x: Number.POSITIVE_INFINITY,
        y: 0,
        z: 0,
      }),
    ).toBe(false);
  });
});
