/**
 * Report pending Drizzle migrations (kickdesk migrate-status contract).
 * Writes the same one-line status to ~/.config/publicweb/migrate-status.
 *
 *   pnpm db:migrate:status
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
	formatKickdeskMigrateLine,
	getMigrationStatus
} from '../src/lib/server/migrationStatus.ts';
import { getDefaultCliDbTarget, resolveCliConnectionString } from './lib/dbCli.ts';

async function computeStatusLine(): Promise<string> {
	const url = resolveCliConnectionString(getDefaultCliDbTarget());
	const result = await getMigrationStatus(url);
	return formatKickdeskMigrateLine(result);
}

function writeMigrateStatusFile(line: string) {
	const configDir = join(homedir(), '.config', 'publicweb');
	mkdirSync(configDir, { recursive: true });
	writeFileSync(join(configDir, 'migrate-status'), `${line}\n`, 'utf8');
}

async function main() {
	const line = await computeStatusLine();
	writeMigrateStatusFile(line);
	console.log(line);
}

main().catch(() => {
	writeMigrateStatusFile('unavailable');
	console.log('unavailable');
	process.exit(0);
});
