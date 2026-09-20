import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { cities, districts, worlds } from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  const now = new Date();

  let [world] = await db
    .select()
    .from(worlds)
    .where(eq(worlds.slug, 'world-zero'))
    .limit(1);

  if (!world) {
    [world] = await db
      .insert(worlds)
      .values({
        slug: 'world-zero',
        name: 'WORLD ZERO',
        status: 'ONLINE',
        tick: 0,
        simulationTime: now,
        lastProcessedAt: now,
      })
      .returning();
  }

  let [city] = await db
    .select()
    .from(cities)
    .where(eq(cities.slug, 'nova-city'))
    .limit(1);

  if (!city) {
    [city] = await db
      .insert(cities)
      .values({
        worldId: world.id,
        slug: 'nova-city',
        name: 'Nova City',
      })
      .returning();
  }

  const [existingDistrict] = await db
    .select()
    .from(districts)
    .where(eq(districts.slug, 'district-01'))
    .limit(1);

  if (!existingDistrict) {
    await db.insert(districts).values({
      cityId: city.id,
      slug: 'district-01',
      name: 'District 01',
      status: 'ONLINE',
    });
  }

  console.log('WORLD ZERO seed complete.');
  console.log(`World: ${world.name}`);
  console.log(`City: ${city.name}`);
  console.log('District: District 01');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('WORLD ZERO seed failed:', error);
    process.exit(1);
  });
