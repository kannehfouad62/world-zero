import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  districts,
  locations,
  npcs,
  npcPlayerRelationships,
  players,
} from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(process.env.DATABASE_URL);

const [existingMaya] = await db
  .select({
    id: npcs.id,
  })
  .from(npcs)
  .where(eq(npcs.slug, 'maya'))
  .limit(1);

if (existingMaya) {
  console.log('Maya already exists.');
  process.exit(0);
}

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

const [restaurant] = await db
  .select({
    id: locations.id,
  })
  .from(locations)
  .where(eq(locations.slug, 'mayas-restaurant'))
  .limit(1);

if (!restaurant) {
  throw new Error("Maya's Restaurant was not found");
}

const [maya] = await db
  .insert(npcs)
  .values({
    districtId: district.id,
    currentLocationId: restaurant.id,
    slug: 'maya',
    firstName: 'Maya',
    occupation: 'Restaurant Owner',
    status: 'ACTIVE',
    positionX: '-27',
    positionY: '0',
    positionZ: '18',
    personality:
      'Independent, practical, observant, hardworking, warm toward people she trusts, and slow to forget meaningful acts of help or betrayal.',
    energy: 82,
    stress: 28,
  })
  .returning({
    id: npcs.id,
  });

const [founder] = await db
  .select({
    id: players.id,
  })
  .from(players)
  .where(eq(players.username, 'founder'))
  .limit(1);

if (founder) {
  await db.insert(npcPlayerRelationships).values({
    npcId: maya.id,
    playerId: founder.id,
    trust: 0,
    familiarity: 0,
    respect: 0,
    resentment: 0,
  });
}

console.log('Maya created.');
console.log("Current location: Maya's Restaurant");
console.log('Occupation: Restaurant Owner');
console.log('Founder relationship initialized.');
