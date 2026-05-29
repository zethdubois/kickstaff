import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { DRIZZLE_DATABASE_URL_ENV } from './src/lib/server/drizzleKitEnv.ts';
import { envFromProcess, getDefaultDbTarget, resolveConnectionStringFromEnv } from './src/lib/server/dbTargetCore.ts';

const dbEnv = envFromProcess();
const migrateOverride = process.env[DRIZZLE_DATABASE_URL_ENV]?.trim();
const url =
	migrateOverride ??
	resolveConnectionStringFromEnv(dbEnv, getDefaultDbTarget(dbEnv));

export default defineConfig({
	schema: './src/lib/server/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url
	}
});
