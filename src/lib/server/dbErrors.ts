/** PG / DNS errors are often nested under Drizzle's `cause`. */
function deepErrorCode(e: unknown): string | undefined {
	if (!e || typeof e !== 'object') return undefined;
	const err = e as { code?: unknown; cause?: unknown };
	if (err.code !== undefined) return String(err.code);
	const c = err.cause;
	if (c && typeof c === 'object' && 'code' in c) return String((c as { code: string }).code);
	return undefined;
}

/**
 * User-facing hint when the app cannot open a TCP connection to Postgres.
 * Typical case: DATABASE_URL uses Railway’s internal host while running `pnpm dev` locally.
 */
export function messageForDbConnectionError(e: unknown): string | undefined {
	const code = deepErrorCode(e);
	if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
		return 'Cannot reach the database. For local dev, use a public or TCP proxy Postgres URL—Railway’s internal host (*.railway.internal) only works inside Railway’s network.';
	}
	return undefined;
}

/** Covers connection issues and missing tables (migrations not applied). */
export function messageForDbError(e: unknown): string | undefined {
	const code = deepErrorCode(e);
	if (code === '42P01') {
		return 'Database tables are missing. With DATABASE_URL set, run: pnpm db:migrate';
	}
	return messageForDbConnectionError(e);
}
