import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

export type MigrationJournal = {
	entries: { idx: number; when: number; tag: string }[];
};

export type MigrationStatusResult = {
	state: 'ok' | 'pending' | 'unavailable';
	journalCount: number;
	appliedCount: number;
	pendingCount: number;
	pendingTags: string[];
	maxAppliedWhen: number | null;
};

const DEFAULT_JOURNAL_PATH = 'drizzle/meta/_journal.json';

export function loadMigrationJournal(rootDir = process.cwd()): MigrationJournal {
	const journalPath = resolve(rootDir, DEFAULT_JOURNAL_PATH);
	const raw = readFileSync(journalPath, 'utf8');
	const parsed = JSON.parse(raw) as MigrationJournal;
	return { entries: parsed.entries ?? [] };
}

function isMissingMigrationsTableError(e: unknown): boolean {
	const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
	return code === '42P01' || code === '3F000';
}

/** Kickdesk one-liner contract: `ok` | `pending:N` | `unavailable`. */
export function formatKickdeskMigrateLine(result: MigrationStatusResult): string {
	if (result.state === 'unavailable') return 'unavailable';
	if (result.state === 'pending') return `pending:${result.pendingCount}`;
	return 'ok';
}

/** Compare journal `when` timestamps to applied migration `created_at` values from the DB. */
export function deriveMigrationStatus(
	entries: MigrationJournal['entries'],
	appliedCreatedAts: number[]
): MigrationStatusResult {
	const journalCount = entries.length;
	if (journalCount === 0) {
		return {
			state: 'ok',
			journalCount: 0,
			appliedCount: 0,
			pendingCount: 0,
			pendingTags: [],
			maxAppliedWhen: null
		};
	}

	let maxApplied = 0;
	for (const ts of appliedCreatedAts) {
		if (!Number.isNaN(ts) && ts > maxApplied) {
			maxApplied = ts;
		}
	}

	const pendingEntries = entries.filter((entry) => entry.when > maxApplied);
	const appliedCount = entries.length - pendingEntries.length;
	const pendingCount = pendingEntries.length;

	return {
		state: pendingCount > 0 ? 'pending' : 'ok',
		journalCount,
		appliedCount,
		pendingCount,
		pendingTags: pendingEntries.map((e) => e.tag),
		maxAppliedWhen: maxApplied > 0 ? maxApplied : null
	};
}

/**
 * Compare Drizzle journal entries to `drizzle.__drizzle_migrations` on the given database.
 */
export async function getMigrationStatus(
	connectionString: string,
	options?: { journalRoot?: string }
): Promise<MigrationStatusResult> {
	try {
		const journal = loadMigrationJournal(options?.journalRoot);
		const entries = journal.entries;

		const pool = new pg.Pool({ connectionString });
		try {
			let appliedCreatedAts: number[] = [];
			try {
				const res = await pool.query<{ created_at: string }>(
					'SELECT created_at FROM drizzle.__drizzle_migrations'
				);
				appliedCreatedAts = res.rows
					.map((row) => Number(row.created_at))
					.filter((ts) => !Number.isNaN(ts));
			} catch (e) {
				if (!isMissingMigrationsTableError(e)) {
					throw e;
				}
			}

			return deriveMigrationStatus(entries, appliedCreatedAts);
		} finally {
			await pool.end();
		}
	} catch {
		return {
			state: 'unavailable',
			journalCount: 0,
			appliedCount: 0,
			pendingCount: 0,
			pendingTags: [],
			maxAppliedWhen: null
		};
	}
}
