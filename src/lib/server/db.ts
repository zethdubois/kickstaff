import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getActiveDbTarget, resolveConnectionString, type DbTarget } from './dbTarget';
import * as schema from './schema';

type DbHandle = {
	pool: pg.Pool;
	db: ReturnType<typeof drizzle<typeof schema>>;
};

/** One pool per database target; requests pick theirs via the request-scoped target. */
const handles = new Map<DbTarget, DbHandle>();

export function getDb() {
	const target = getActiveDbTarget();
	let handle = handles.get(target);
	if (!handle) {
		const pool = new pg.Pool({ connectionString: resolveConnectionString(target) });
		handle = { pool, db: drizzle(pool, { schema }) };
		handles.set(target, handle);
	}
	return handle.db;
}
