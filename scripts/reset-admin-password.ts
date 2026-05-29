/**
 * Set an admin user's password hash from ADMIN_EMAIL + ADMIN_PASSWORD in .env.
 *
 * Usage:
 *   pnpm reset:admin-password
 *   pnpm reset:admin-password --db prod
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
	const password = process.env.ADMIN_PASSWORD?.trim();

	console.log('Database:', getCliDbDisplayInfo(target).label);
	if (!email || !password) {
		console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required in .env');
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing.length === 0) {
		console.error('No user for', email, '— run pnpm seed:admin first');
		await pool.end();
		process.exit(1);
	}

	const passwordHash = await hash(password);
	await db
		.update(users)
		.set({ passwordHash, mustChangePassword: false })
		.where(eq(users.email, email));

	console.log('Updated password for:', email);
	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
