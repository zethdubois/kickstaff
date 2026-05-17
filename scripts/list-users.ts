/**
 * Print emails (and roles) in the connected database — sanity-check for login issues.
 *
 *   pnpm list:users
 *
 * If the email you expect is missing, check active target with `pnpm db:status`.
 */
import 'dotenv/config';
import { asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/lib/server/schema.ts';
import {
	getCliDbDisplayInfo,
	getDefaultCliDbTarget,
	resolveCliConnectionString
} from './lib/dbCli.ts';

const { users } = schema;

async function main() {
	const target = getDefaultCliDbTarget();
	const url = resolveCliConnectionString(target);
	console.log('Database:', getCliDbDisplayInfo(target).label);

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
