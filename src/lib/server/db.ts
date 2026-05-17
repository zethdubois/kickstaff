import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getActiveDbTarget, resolveConnectionString } from './dbTarget';
import * as schema from './schema';

let pool: pg.Pool | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export async function resetDbPool(): Promise<void> {
	if (pool) {
		await pool.end();
	}
	pool = undefined;
	dbInstance = undefined;
}

export function getDb() {
	const connectionString = resolveConnectionString(getActiveDbTarget());
	if (!pool) {
		pool = new pg.Pool({ connectionString });
		dbInstance = drizzle(pool, { schema });
	}
	if (!dbInstance) {
		throw new Error('Database failed to initialize');
	}
	return dbInstance;
}
