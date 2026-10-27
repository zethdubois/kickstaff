/**
 * Rotate the ADMIN_EMAIL user's password to a new random value (printed once).
 * Sets mustChangePassword so they must pick a password after login.
 *
 * Usage:
 *   pnpm reset:admin-password
 *   pnpm reset:admin-password --db staging
 *   pnpm reset:admin-password --db prod
 *
 * Optional: ADMIN_PASSWORD in .env forces that value instead of random (legacy).
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/lib/server/schema.ts';
import {
	getCliDbDisplayInfo,
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfExplicitProdCliTarget
} from './lib/dbCli.ts';

const { users } = schema;

function generateRandomPassword(bytes = 18): string {
	return randomBytes(bytes).toString('base64url');
}

async function main() {
	const cliArgv = process.argv.slice(2);
	warnIfExplicitProdCliTarget(cliArgv);
	const target = resolveCliDbTarget(cliArgv);
	const url = resolveCliConnectionString(target);
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const fromEnv = process.env.ADMIN_PASSWORD?.trim();

	console.log('Database:', getCliDbDisplayInfo(target).label);
	if (!email) {
		console.error('ADMIN_EMAIL is required in .env');
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing.length === 0) {
		console.error('No user for', email, '— run pnpm seed:admin --db', target, 'first');
		await pool.end();
		process.exit(1);
	}

	const plain = fromEnv || generateRandomPassword();
	const passwordHash = await hash(plain);
	await db
		.update(users)
		.set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
		.where(eq(users.email, email));

	console.log('Updated password for:', email);
	if (fromEnv) {
		console.log('Used ADMIN_PASSWORD from env; user must change password on next login.');
	} else {
		console.log('Temporary password (save now):', plain);
	}
	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
