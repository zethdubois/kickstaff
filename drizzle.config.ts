import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { envFromProcess, getDefaultDbTarget, resolveConnectionStringFromEnv } from './src/lib/server/dbTargetCore.ts';

const dbEnv = envFromProcess();
const target = getDefaultDbTarget(dbEnv);
const url = resolveConnectionStringFromEnv(dbEnv, target);

export default defineConfig({
	schema: './src/lib/server/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url
	}
});
