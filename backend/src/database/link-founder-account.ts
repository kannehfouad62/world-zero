import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { accounts, players } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ACCOUNT_EMAIL;
const password = process.env.BOOTSTRAP_ACCOUNT_PASSWORD;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!email || !password) {
  throw new Error(
    'BOOTSTRAP_ACCOUNT_EMAIL and BOOTSTRAP_ACCOUNT_PASSWORD are required',
  );
}

if (password.length < 10 || password.length > 128) {
  throw new Error('Bootstrap password must be between 10 and 128 characters');
}

const db = drizzle(databaseUrl);

console.log('Starting Founder account bootstrap...');

const [player] = await db
  .select({
    id: players.id,
    username: players.username,
  })
  .from(players)
  .where(eq(players.username, 'founder'))
  .limit(1);

if (!player) {
  throw new Error('Founder player was not found');
}

console.log('Founder player located.');

const [existingAccount] = await db
  .select({
    id: accounts.id,
  })
  .from(accounts)
  .where(eq(accounts.playerId, player.id))
  .limit(1);

if (existingAccount) {
  throw new Error('Founder already has an account');
}

console.log('Creating secure password hash...');

const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
});

await db.insert(accounts).values({
  playerId: player.id,
  email: email.trim().toLowerCase(),
  passwordHash,
  status: 'ACTIVE',
});

console.log('Founder authentication account created.');
