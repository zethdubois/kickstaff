/**
 * Print emails (and roles) in the connected database — sanity-check for login issues.
 *
 *   pnpm list:users
 *
 * If the email you expect is missing, your DATABASE_URL may point at a different DB than
 * where you ran seed:admin or created users in /admin/users.
 */
import 'dotenv/config';
import { asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/lib/server/schema.ts';

const { users } = schema;

async function main() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error('DATABASE_URL is required');
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	const rows = await db
		.select({ email: users.email, role: users.role })
		.from(users)
		.orderBy(asc(users.email));

	if (rows.length === 0) {
		console.log('No users in this database. Run: pnpm seed:admin');
	} else {
		console.log(`Users (${rows.length}):`);
		for (const r of rows) {
			console.log(`  ${r.email}  [${r.role}]`);
		}
	}

	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
