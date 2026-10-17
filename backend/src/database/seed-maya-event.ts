import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { districts, npcs, worldEvents } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(databaseUrl);

const EVENT_SLUG = 'maya-stolen-supplies-01';

async function seedMayaEvent(): Promise<void> {
  const [district] = await db
    .select({
      id: districts.id,
    })
    .from(districts)
    .where(eq(districts.slug, 'district-01'))
    .limit(1);

  if (!district) {
    throw new Error('District 01 was not found');
  }

  const [maya] = await db
    .select({
      id: npcs.id,
      districtId: npcs.districtId,
    })
    .from(npcs)
    .where(eq(npcs.slug, 'maya'))
    .limit(1);

  if (!maya) {
    throw new Error('Maya was not found');
  }

  if (maya.districtId !== district.id) {
    throw new Error('Maya does not belong to District 01');
  }

  const [event] = await db
    .insert(worldEvents)
    .values({
      slug: EVENT_SLUG,
      districtId: district.id,
      npcId: maya.id,
      title: "Maya's Stolen Supplies",
      description:
        'Someone stole supplies from Maya’s restaurant. ' +
        'Maya is asking nearby residents whether they will help.',
      status: 'AVAILABLE',
    })
    .onConflictDoNothing({
      target: worldEvents.slug,
    })
    .returning({
      id: worldEvents.id,
    });

  if (event) {
    console.log('Maya world event created.');
  } else {
    console.log('Maya world event already exists.');
  }

  console.log(`Event slug: ${EVENT_SLUG}`);
}

await seedMayaEvent();
