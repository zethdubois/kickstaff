/**
 * Report pending Drizzle migrations (kickdesk migrate-status contract).
 * Writes the same one-line status to ~/.config/publicweb/migrate-status.
 *
 *   pnpm db:migrate:status
 *   pnpm db:migrate:status -- --db prod
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
	formatKickdeskMigrateLine,
	getMigrationStatus
} from '../src/lib/server/migrationStatus.ts';
import {
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfExplicitProdCliTarget
} from './lib/dbCli.ts';

async function computeStatusLine(cliArgv: string[]): Promise<string> {
	const target = resolveCliDbTarget(cliArgv);
	const url = resolveCliConnectionString(target);
	const result = await getMigrationStatus(url);
	return formatKickdeskMigrateLine(result);
}

function writeMigrateStatusFile(line: string) {
	const configDir = join(homedir(), '.config', 'publicweb');
	mkdirSync(configDir, { recursive: true });
	writeFileSync(join(configDir, 'migrate-status'), `${line}\n`, 'utf8');
}

async function main() {
	const cliArgv = process.argv.slice(2);
	warnIfExplicitProdCliTarget(cliArgv);
	const line = await computeStatusLine(cliArgv);
	writeMigrateStatusFile(line);
	console.log(line);
}

main().catch(() => {
	writeMigrateStatusFile('unavailable');
	console.log('unavailable');
	process.exit(0);
});
