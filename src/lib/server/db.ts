import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

let pool: pg.Pool | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
	const connectionString = env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is not set');
	}
	if (!pool) {
		pool = new pg.Pool({ connectionString });
		dbInstance = drizzle(pool, { schema });
	}
	if (!dbInstance) {
		throw new Error('Database failed to initialize');
	}
	return dbInstance;
}
