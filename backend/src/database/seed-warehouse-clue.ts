import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eventClues, locations, worldEvents } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(databaseUrl);

const [event] = await db
  .select({
    id: worldEvents.id,
    districtId: worldEvents.districtId,
  })
  .from(worldEvents)
  .where(eq(worldEvents.slug, 'maya-stolen-supplies-01'))
  .limit(1);

if (!event) {
  throw new Error('Maya event was not found');
}

const [warehouse] = await db
  .select({
    id: locations.id,
    districtId: locations.districtId,
  })
  .from(locations)
  .where(eq(locations.slug, 'warehouse'))
  .limit(1);

if (!warehouse || warehouse.districtId !== event.districtId) {
  throw new Error(
    'Warehouse location is missing or belongs to another district',
  );
}

const [created] = await db
  .insert(eventClues)
  .values({
    eventId: event.id,
    districtId: event.districtId,
    slug: 'maya-warehouse-shipping-record',
    title: 'Warehouse Shipping Record',
    description:
      'A shipping record linking the missing restaurant supplies to the warehouse.',
    positionX: '50',
    positionY: '0',
    positionZ: '29',
    requiredStep: 1,
    isActive: true,
  })
  .onConflictDoNothing({
    target: eventClues.slug,
  })
  .returning({
    id: eventClues.id,
  });

console.log(
  created
    ? 'Warehouse shipping record clue created.'
    : 'Warehouse shipping record clue already exists.',
);
