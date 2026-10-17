import { describe, expect, it } from 'vitest';
import {
  MAYA_HELP_CONSEQUENCES,
  MAYA_STOLEN_SUPPLIES_EVENT_SLUG,
  NPC_INTERACTION_DISTANCE,
} from './npc.constants.js';

describe('Maya event rules', () => {
  it('uses the expected persistent event identifier', () => {
    expect(MAYA_STOLEN_SUPPLIES_EVENT_SLUG).toBe('maya-stolen-supplies-01');
  });

  it('requires proximity for interaction', () => {
    expect(NPC_INTERACTION_DISTANCE).toBe(5);
  });

  it('awards the configured HELP consequences', () => {
    expect(MAYA_HELP_CONSEQUENCES.HELP.trust).toBe(15);
    expect(MAYA_HELP_CONSEQUENCES.HELP.respect).toBe(10);
    expect(MAYA_HELP_CONSEQUENCES.HELP.familiarity).toBe(5);
  });

  it('applies the configured REFUSE consequences', () => {
    expect(MAYA_HELP_CONSEQUENCES.REFUSE.trust).toBe(-8);
    expect(MAYA_HELP_CONSEQUENCES.REFUSE.resentment).toBe(12);
    expect(MAYA_HELP_CONSEQUENCES.REFUSE.familiarity).toBe(5);
  });
});
