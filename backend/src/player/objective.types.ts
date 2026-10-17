export interface PlayerObjectiveResponse {
  id: string;
  eventId: string;
  eventSlug: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStep: number;
  totalSteps: number;
  currentObjective: string | null;
  districtId: string;
  startedAt: string;
  completedAt: string | null;
}

export interface PlayerObjectivesResponse {
  objectives: PlayerObjectiveResponse[];
}
