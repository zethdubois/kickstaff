/**
 * Run drizzle-kit migrate against dev (default) or prod URL.
 *
 *   pnpm db:migrate        # dev when DATABASE_URL_DEV is set
 *   pnpm db:migrate:prod   # production DATABASE_URL
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolveCliConnectionString, type CliDbTarget } from './lib/dbCli.ts';

const target: CliDbTarget = process.argv[2] === 'prod' ? 'prod' : 'dev';

if (target === 'prod') {
	console.warn('⚠ Applying migrations to PRODUCTION (DATABASE_URL)');
}

const url = resolveCliConnectionString(target);
const info = target === 'dev' ? 'dev (DATABASE_URL_DEV)' : 'prod (DATABASE_URL)';
console.log(`Migrating: ${info}`);

const result = spawnSync('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
	env: { ...process.env, DATABASE_URL: url },
	stdio: 'inherit',
	shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
