/**
 * Run drizzle-kit migrate against dev (default) or prod URL.
 *
 *   pnpm db:migrate
 *   pnpm db:migrate --db prod
 *   pnpm db:migrate prod
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { DRIZZLE_DATABASE_URL_ENV } from '../src/lib/server/drizzleKitEnv.ts';
import {
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfProdMigrateTarget
} from './lib/dbCli.ts';

const cliArgv = process.argv.slice(2);
const target = resolveCliDbTarget(cliArgv);

warnIfProdMigrateTarget(target);

const url = resolveCliConnectionString(target);
const info = target === 'dev' ? 'dev (DATABASE_URL_DEV)' : 'prod (DATABASE_URL)';
console.log(`Migrating: ${info}`);

const result = spawnSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
	env: {
		...process.env,
		[DRIZZLE_DATABASE_URL_ENV]: url,
		DATABASE_URL: url
	},
	stdio: 'inherit',
	shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
