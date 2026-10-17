export const MAYA_SLUG = 'maya';

export const MAYA_HELP_CONSEQUENCES = {
  HELP: {
    trust: 15,
    familiarity: 5,
    respect: 10,
    resentment: 0,
    memoryType: 'HELP' as const,
    memoryImportance: 75,
  },

  REFUSE: {
    trust: -8,
    familiarity: 5,
    respect: 0,
    resentment: 12,
    memoryType: 'INTERACTION' as const,
    memoryImportance: 65,
  },
};

export const MAYA_STOLEN_SUPPLIES_EVENT_SLUG = 'maya-stolen-supplies-01';

export const NPC_INTERACTION_DISTANCE = 5;
