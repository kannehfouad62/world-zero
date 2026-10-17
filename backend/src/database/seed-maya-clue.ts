import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { districts, eventClues, worldEvents } from './schema.js';

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

const [district] = await db
  .select({ id: districts.id })
  .from(districts)
  .where(eq(districts.slug, 'district-01'))
  .limit(1);

if (!district || district.id !== event.districtId) {
  throw new Error('Event district does not match District 01');
}

const [created] = await db
  .insert(eventClues)
  .values({
    eventId: event.id,
    districtId: district.id,
    slug: 'maya-delivery-receipt',
    title: 'Missing Delivery Receipt',
    description:
      'A delivery receipt containing information about the missing restaurant supplies.',
    positionX: '-27',
    positionY: '0',
    positionZ: '14',
    requiredStep: 0,
    isActive: true,
  })
  .onConflictDoNothing({ target: eventClues.slug })
  .returning({ id: eventClues.id });

console.log(
  created
    ? 'Maya delivery receipt clue created.'
    : 'Maya delivery receipt clue already exists.',
);
