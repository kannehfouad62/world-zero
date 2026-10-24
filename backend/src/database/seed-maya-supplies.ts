import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eventRecoverableItems, worldEvents } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(databaseUrl);

const EVENT_SLUG = 'maya-stolen-supplies-01';
const ITEM_SLUG = 'maya-stolen-supply-crate';

const [event] = await db
  .select({
    id: worldEvents.id,
    districtId: worldEvents.districtId,
  })
  .from(worldEvents)
  .where(eq(worldEvents.slug, EVENT_SLUG))
  .limit(1);

if (!event) {
  throw new Error('Maya world event was not found');
}

const [created] = await db
  .insert(eventRecoverableItems)
  .values({
    eventId: event.id,
    districtId: event.districtId,
    slug: ITEM_SLUG,
    name: "Maya's Stolen Supply Crate",
    description: 'A crate containing supplies stolen from Maya’s restaurant.',
    positionX: '54',
    positionY: '0',
    positionZ: '29',
    requiredStep: 2,
    isActive: true,
  })
  .onConflictDoNothing({
    target: eventRecoverableItems.slug,
  })
  .returning({
    id: eventRecoverableItems.id,
  });

console.log(
  created ? 'Maya supply crate created.' : 'Maya supply crate already exists.',
);

console.log(`Item slug: ${ITEM_SLUG}`);
