export interface MissionJournalEntry {
  id: string;
  eventId: string;
  eventSlug: string;
  title: string;
  description: string;
  districtId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStep: number;
  totalSteps: number | null;
  startedAt: string;
  completedAt: string | null;
  decision: 'HELP' | 'REFUSE' | null;
  decidedAt: string | null;
  evidence: {
    slug: string;
    title: string;
    discoveredAt: string;
  }[];
  recoveredItems: {
    slug: string;
    name: string;
    recoveredAt: string;
  }[];
  npc: {
    id: string;
    name: string;
  };
  relationship: {
    trust: number;
    familiarity: number;
    respect: number;
    resentment: number;
  } | null;
  memories: {
    id: string;
    type: string;
    summary: string;
    importance: number;
    occurredAt: string;
  }[];
}

export interface MissionJournalResponse {
  missions: MissionJournalEntry[];
}
