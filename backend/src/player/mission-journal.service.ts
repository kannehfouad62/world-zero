import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import {
  eventClues,
  eventRecoverableItems,
  npcMemories,
  npcs,
  npcPlayerRelationships,
  playerClueDiscoveries,
  playerEventDecisions,
  playerEventProgress,
  playerRecoveredItems,
  worldEvents,
} from '../database/schema.js';
import type {
  MissionJournalEntry,
  MissionJournalResponse,
} from './mission-journal.types.js';

const MAYA_EVENT_SLUG = 'maya-stolen-supplies-01';

@Injectable()
export class MissionJournalService {
  constructor(private readonly database: DatabaseService) {}

  async getJournal(playerId: string): Promise<MissionJournalResponse> {
    const progressRows = await this.database.db
      .select({
        id: playerEventProgress.id,
        eventId: worldEvents.id,
        eventSlug: worldEvents.slug,
        title: worldEvents.title,
        description: worldEvents.description,
        districtId: worldEvents.districtId,
        npcId: npcs.id,
        npcName: npcs.firstName,
        status: playerEventProgress.status,
        currentStep: playerEventProgress.currentStep,
        startedAt: playerEventProgress.startedAt,
        completedAt: playerEventProgress.completedAt,
      })
      .from(playerEventProgress)
      .innerJoin(worldEvents, eq(playerEventProgress.eventId, worldEvents.id))
      .innerJoin(npcs, eq(worldEvents.npcId, npcs.id))
      .where(eq(playerEventProgress.playerId, playerId))
      .orderBy(desc(playerEventProgress.startedAt));

    if (progressRows.length === 0) {
      return { missions: [] };
    }

    const eventIds = progressRows.map((row) => row.eventId);
    const npcIds = [...new Set(progressRows.map((row) => row.npcId))];

    const [decisions, discoveries, recoveredItems, relationships, memories] =
      await Promise.all([
        this.database.db
          .select({
            eventId: playerEventDecisions.eventId,
            decision: playerEventDecisions.decision,
            decidedAt: playerEventDecisions.createdAt,
          })
          .from(playerEventDecisions)
          .where(
            and(
              eq(playerEventDecisions.playerId, playerId),
              inArray(playerEventDecisions.eventId, eventIds),
            ),
          ),

        this.database.db
          .select({
            eventId: playerClueDiscoveries.eventId,
            slug: eventClues.slug,
            title: eventClues.title,
            discoveredAt: playerClueDiscoveries.discoveredAt,
          })
          .from(playerClueDiscoveries)
          .innerJoin(
            eventClues,
            eq(playerClueDiscoveries.clueId, eventClues.id),
          )
          .where(
            and(
              eq(playerClueDiscoveries.playerId, playerId),
              inArray(playerClueDiscoveries.eventId, eventIds),
            ),
          ),

        this.database.db
          .select({
            eventId: playerRecoveredItems.eventId,
            slug: eventRecoverableItems.slug,
            name: eventRecoverableItems.name,
            recoveredAt: playerRecoveredItems.recoveredAt,
          })
          .from(playerRecoveredItems)
          .innerJoin(
            eventRecoverableItems,
            eq(playerRecoveredItems.itemId, eventRecoverableItems.id),
          )
          .where(
            and(
              eq(playerRecoveredItems.playerId, playerId),
              inArray(playerRecoveredItems.eventId, eventIds),
            ),
          ),

        this.database.db
          .select({
            npcId: npcPlayerRelationships.npcId,
            trust: npcPlayerRelationships.trust,
            familiarity: npcPlayerRelationships.familiarity,
            respect: npcPlayerRelationships.respect,
            resentment: npcPlayerRelationships.resentment,
          })
          .from(npcPlayerRelationships)
          .where(
            and(
              eq(npcPlayerRelationships.playerId, playerId),
              inArray(npcPlayerRelationships.npcId, npcIds),
            ),
          ),

        this.database.db
          .select({
            id: npcMemories.id,
            npcId: npcMemories.npcId,
            type: npcMemories.type,
            summary: npcMemories.summary,
            importance: npcMemories.importance,
            occurredAt: npcMemories.occurredAt,
          })
          .from(npcMemories)
          .where(
            and(
              eq(npcMemories.playerId, playerId),
              inArray(npcMemories.npcId, npcIds),
            ),
          ),
      ]);

    const missions: MissionJournalEntry[] = progressRows.map((row) => {
      const decision = decisions.find((entry) => entry.eventId === row.eventId);

      const relationship = relationships.find(
        (entry) => entry.npcId === row.npcId,
      );

      return {
        id: row.id,
        eventId: row.eventId,
        eventSlug: row.eventSlug,
        title: row.title,
        description: row.description,
        districtId: row.districtId,
        status: row.status,
        currentStep: row.currentStep,
        totalSteps: row.eventSlug === MAYA_EVENT_SLUG ? 4 : null,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
        decision: decision?.decision ?? null,
        decidedAt: decision?.decidedAt.toISOString() ?? null,
        evidence: discoveries
          .filter((entry) => entry.eventId === row.eventId)
          .sort((a, b) => a.discoveredAt.getTime() - b.discoveredAt.getTime())
          .map((entry) => ({
            slug: entry.slug,
            title: entry.title,
            discoveredAt: entry.discoveredAt.toISOString(),
          })),
        recoveredItems: recoveredItems
          .filter((entry) => entry.eventId === row.eventId)
          .sort((a, b) => a.recoveredAt.getTime() - b.recoveredAt.getTime())
          .map((entry) => ({
            slug: entry.slug,
            name: entry.name,
            recoveredAt: entry.recoveredAt.toISOString(),
          })),
        npc: {
          id: row.npcId,
          name: row.npcName,
        },
        relationship: relationship
          ? {
              trust: relationship.trust,
              familiarity: relationship.familiarity,
              respect: relationship.respect,
              resentment: relationship.resentment,
            }
          : null,
        memories: memories
          .filter((entry) => entry.npcId === row.npcId)
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
          .map((entry) => ({
            id: entry.id,
            type: entry.type,
            summary: entry.summary,
            importance: entry.importance,
            occurredAt: entry.occurredAt.toISOString(),
          })),
      };
    });

    return { missions };
  }
}
