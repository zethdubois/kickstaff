/**
 * Report pending Drizzle migrations (kickdesk migrate-status contract).
 *
 *   pnpm db:migrate:status
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { getDefaultCliDbTarget, resolveCliConnectionString } from './lib/dbCli.ts';

type Journal = {
	entries: { idx: number; when: number; tag: string }[];
};

async function main() {
	try {
		const url = resolveCliConnectionString(getDefaultCliDbTarget());
		const journalPath = resolve(process.cwd(), 'drizzle/meta/_journal.json');
		const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
		const entries = journal.entries ?? [];
		if (entries.length === 0) {
			console.log('ok');
			return;
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
			if (pending > 0) {
				console.log(`pending:${pending}`);
			} else {
				console.log('ok');
			}
		} finally {
			await pool.end();
		}
	} catch {
		console.log('unavailable');
	}
}

main().catch(() => {
	console.log('unavailable');
	process.exit(0);
});
