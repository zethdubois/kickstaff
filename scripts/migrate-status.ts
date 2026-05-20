/**
 * Report pending Drizzle migrations (kickdesk migrate-status contract).
 * Writes the same one-line status to ~/.config/publicweb/migrate-status.
 *
 *   pnpm db:migrate:status
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { getDefaultCliDbTarget, resolveCliConnectionString } from './lib/dbCli.ts';

type Journal = {
	entries: { idx: number; when: number; tag: string }[];
};

async function computeStatusLine(): Promise<string> {
	try {
		const url = resolveCliConnectionString(getDefaultCliDbTarget());
		const journalPath = resolve(process.cwd(), 'drizzle/meta/_journal.json');
		const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
		const entries = journal.entries ?? [];
		if (entries.length === 0) {
			return 'ok';
		}

		const pool = new pg.Pool({ connectionString: url });
		try {
			let maxApplied = 0;
			try {
				const res = await pool.query<{ created_at: string }>(
					'SELECT created_at FROM drizzle.__drizzle_migrations'
				);
				for (const row of res.rows) {
					const ts = Number(row.created_at);
					if (!Number.isNaN(ts) && ts > maxApplied) {
						maxApplied = ts;
					}
				}
			} catch (e) {
				// Fresh DB before first migrate — no ledger table yet.
				const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
				if (code !== '42P01' && code !== '3F000') {
					throw e;
				}
			}
			const pending = entries.filter((entry) => entry.when > maxApplied).length;
			return pending > 0 ? `pending:${pending}` : 'ok';
		} finally {
			await pool.end();
		}
	} catch {
		return 'unavailable';
	}
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
