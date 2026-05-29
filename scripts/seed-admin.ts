/**
 * One-time: create the first admin user if missing.
 *
 * Usage (from repo root, with .env or env vars):
 *   pnpm seed:admin
 *   pnpm seed:admin --db prod
 *
 * Requires: DATABASE_URL_DEV or DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 */
import 'dotenv/config';
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

async function main() {
	const cliArgv = process.argv.slice(2);
	warnIfExplicitProdCliTarget(cliArgv);
	const target = resolveCliDbTarget(cliArgv);
	const url = resolveCliConnectionString(target);
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;

	console.log('Database:', getCliDbDisplayInfo(target).label);
	if (!email || !password) {
		console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing.length > 0) {
		console.log('User already exists:', email);
		await pool.end();
		return;
	}

	const passwordHash = await hash(password);
	await db.insert(users).values({
		email,
		passwordHash,
		role: 'admin',
		mustChangePassword: false
	});

	console.log('Created admin user:', email);
	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
