import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  playerEventDecisions,
  playerEventProgress,
  worldEvents,
} from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(databaseUrl);

const eventSlug = 'maya-stolen-supplies-01';

const [event] = await db
  .select({
    id: worldEvents.id,
  })
  .from(worldEvents)
  .where(eq(worldEvents.slug, eventSlug))
  .limit(1);

if (!event) {
  throw new Error('Maya investigation event was not found');
}

const decisions = await db
  .select({
    playerId: playerEventDecisions.playerId,
    decision: playerEventDecisions.decision,
  })
  .from(playerEventDecisions)
  .where(eq(playerEventDecisions.eventId, event.id));

let created = 0;

for (const decision of decisions) {
  if (decision.decision !== 'HELP') {
    continue;
  }

  const inserted = await db
    .insert(playerEventProgress)
    .values({
      eventId: event.id,
      playerId: decision.playerId,
      status: 'ACTIVE',
      currentStep: 0,
    })
    .onConflictDoNothing({
      target: [playerEventProgress.eventId, playerEventProgress.playerId],
    })
    .returning({
      id: playerEventProgress.id,
    });

  created += inserted.length;
}

console.log(`Investigation progress initialized. New records: ${created}`);
