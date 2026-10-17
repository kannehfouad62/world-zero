export interface NpcPositionResponse {
  x: number;
  y: number;
  z: number;
}

export interface NpcResponse {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  occupation: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DECEASED';
  districtId: string;
  currentLocation: {
    id: string;
    name: string;
    slug: string;
  } | null;
  position: NpcPositionResponse;
  personality: string;
  energy: number;
  stress: number;
}

export interface NpcRelationshipResponse {
  npcId: string;
  playerId: string;
  trust: number;
  familiarity: number;
  respect: number;
  resentment: number;
  lastInteractionAt: string | null;
}

export type MayaHelpDecision = 'HELP' | 'REFUSE';

export interface MayaHelpDecisionInput {
  decision: MayaHelpDecision;
}

export interface MayaInteractionResponse {
  npc: {
    id: string;
    name: string;
  };
  decision: MayaHelpDecision;
  message: string;
  relationship: NpcRelationshipResponse;
  memory: {
    id: string;
    type: string;
    summary: string;
    importance: number;
    occurredAt: string;
  };
}
