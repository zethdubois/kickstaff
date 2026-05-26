import pg from 'pg';

export type TableRow = {
	schema: string;
	name: string;
	approxRows: number | null;
};

export type ConnectionTestResult =
	| { ok: true }
	| { ok: false; message: string };

export async function testDatabaseConnection(connectionString: string): Promise<ConnectionTestResult> {
	const pool = new pg.Pool({ connectionString });
	try {
		await pool.query('SELECT 1');
		return { ok: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, message };
	} finally {
		await pool.end();
	}
}

/** List user tables in `public` and `drizzle` schemas (live DB, not schema.ts). */
export async function listDatabaseTables(connectionString: string): Promise<TableRow[]> {
	const pool = new pg.Pool({ connectionString });
	try {
		const res = await pool.query<{
			schema: string;
			name: string;
			approx_rows: string | null;
		}>(
			`SELECT
				n.nspname AS schema,
				c.relname AS name,
				GREATEST(c.reltuples::bigint, 0)::text AS approx_rows
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE c.relkind = 'r'
				AND n.nspname IN ('public', 'drizzle')
			ORDER BY n.nspname, c.relname`
		);
		return res.rows.map((row) => ({
			schema: row.schema,
			name: row.name,
			approxRows: row.approx_rows !== null ? Number(row.approx_rows) : null
		}));
	} finally {
		await pool.end();
	}
}
