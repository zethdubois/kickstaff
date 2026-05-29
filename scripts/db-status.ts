/**
 * Print active CLI database target and test connectivity.
 *
 *   pnpm db:status
 *   pnpm db:status -- --db prod
 */
import 'dotenv/config';
import pg from 'pg';
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
