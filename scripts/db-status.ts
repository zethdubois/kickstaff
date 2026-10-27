/**
 * Print active CLI database target and test connectivity.
 *
 *   pnpm db:status
 *   pnpm db:status --db prod
 */
import 'dotenv/config';
import pg from 'pg';
import { getMigrationStatus } from '../src/lib/server/migrationStatus.ts';
import {
	getCliDbDisplayInfo,
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfExplicitProdCliTarget
} from './lib/dbCli.ts';

async function main() {
	const cliArgv = process.argv.slice(2);
	warnIfExplicitProdCliTarget(cliArgv);
	const target = resolveCliDbTarget(cliArgv);
	const info = getCliDbDisplayInfo(target);
	console.log(`target: ${info.target}`);
	console.log(`label: ${info.label}`);

	const pool = new pg.Pool({ connectionString: resolveCliConnectionString(target) });
	try {
		await pool.query('SELECT 1');
		console.log('connected: ok');

		// Read-only. (Unlike `db:migrate:status`, this does not write the Kickdesk status file,
		// so it is safe to point at prod.)
		const m = await getMigrationStatus(resolveCliConnectionString(target));
		if (m.state === 'pending') {
			console.warn(
				`migrations: ⚠ PENDING ${m.pendingCount} — ${m.pendingTags.join(', ')}\n` +
					`  Apply before deploying code that needs them: pnpm db:migrate --db ${target}`
			);
		} else {
			console.log(`migrations: ${m.state}`);
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error('connected: failed —', message);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
