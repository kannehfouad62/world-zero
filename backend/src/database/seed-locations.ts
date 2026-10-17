import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { districts, locations } from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(process.env.DATABASE_URL);

const locationSeeds = [
  {
    slug: 'mayas-restaurant',
    name: "Maya's Restaurant",
    type: 'RESTAURANT' as const,
    x: -27,
    y: 0,
    z: 23,
  },
  {
    slug: 'convenience-store',
    name: 'Convenience Store',
    type: 'STORE' as const,
    x: 25,
    y: 0,
    z: 24,
  },
  {
    slug: 'apartment-building',
    name: 'Apartment Building',
    type: 'RESIDENTIAL' as const,
    x: -48,
    y: 0,
    z: 42,
  },
  {
    slug: 'bank',
    name: 'Bank',
    type: 'BANK' as const,
    x: -30,
    y: 0,
    z: -26,
  },
  {
    slug: 'police-station',
    name: 'Police Station',
    type: 'POLICE_STATION' as const,
    x: 29,
    y: 0,
    z: -27,
  },
  {
    slug: 'hospital',
    name: 'Hospital',
    type: 'HOSPITAL' as const,
    x: -48,
    y: 0,
    z: -49,
  },
  {
    slug: 'warehouse',
    name: 'Warehouse',
    type: 'WAREHOUSE' as const,
    x: 50,
    y: 0,
    z: 44,
  },
  {
    slug: 'office',
    name: 'Office',
    type: 'OFFICE' as const,
    x: 20,
    y: 0,
    z: -50,
  },
  {
    slug: 'park',
    name: 'Park',
    type: 'PARK' as const,
    x: 30,
    y: 0,
    z: 49,
  },
];

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

for (const location of locationSeeds) {
  const [existing] = await db
    .select({
      id: locations.id,
    })
    .from(locations)
    .where(eq(locations.slug, location.slug))
    .limit(1);

  if (existing) {
    continue;
  }

  await db.insert(locations).values({
    districtId: district.id,
    slug: location.slug,
    name: location.name,
    type: location.type,
    positionX: String(location.x),
    positionY: String(location.y),
    positionZ: String(location.z),
  });

  console.log(`Created location: ${location.name}`);
}

console.log('District 01 location seed complete.');
