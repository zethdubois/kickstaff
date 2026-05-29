/**
 * PostgreSQL SQLSTATE values are 5 ASCII chars (e.g. 42P01, 42703).
 * Node / DNS errors use string codes like ECONNREFUSED — exclude those when
 * looking for a PG code so we do not mis-classify nested errors.
 */
function isPostgresSqlState(code: string): boolean {
	return /^[0-9]{2}[0-9A-Z]{3}$/.test(code);
}

/** Walk `cause` chain; return first `.code` matching `predicate`. */
function firstErrorCode(
	e: unknown,
	predicate: (code: string) => boolean
): string | undefined {
	let current: unknown = e;
	const seen = new Set<unknown>();
	for (let depth = 0; depth < 12 && current && typeof current === 'object'; depth++) {
		if (seen.has(current)) break;
		seen.add(current);
		const err = current as { code?: unknown; cause?: unknown };
		if (err.code !== undefined && err.code !== null) {
			const c = String(err.code);
			if (predicate(c)) return c;
		}
		current = err.cause;
	}
	return undefined;
}

/** First SQLSTATE from Postgres in the error chain (outer → inner). */
export function deepPostgresSqlState(e: unknown): string | undefined {
	return firstErrorCode(e, isPostgresSqlState);
}

/** Syscall / DNS style codes from the chain. */
function deepSyscallErrorCode(e: unknown): string | undefined {
	return firstErrorCode(
		e,
		(c) => c === 'ENOTFOUND' || c === 'ECONNREFUSED' || c === 'ETIMEDOUT'
	);
}

/** Best-effort single-line detail for logs and error pages. */
export function describeDbFailure(e: unknown): string {
	if (e instanceof Error) return e.message;
	return String(e);
}

/**
 * User-facing hint when the app cannot open a TCP connection to Postgres.
 * Typical case: DATABASE_URL uses Railway’s internal host while running `pnpm dev` locally.
 */
export function messageForDbConnectionError(e: unknown): string | undefined {
	const code = deepSyscallErrorCode(e);
	if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
		return 'Cannot reach the database. For local dev, use a public or TCP proxy Postgres URL—Railway’s internal host (*.railway.internal) only works inside Railway’s network.';
	}
	return undefined;
}

/** Undefined table / undefined column — migrations not applied. */
export function isSchemaMismatchError(e: unknown): boolean {
	const pg = deepPostgresSqlState(e);
	return pg === '42P01' || pg === '42703';
}

/** Covers connection issues and missing tables/columns (migrations not applied). */
export function messageForDbError(e: unknown): string | undefined {
	const pg = deepPostgresSqlState(e);
	if (pg === '42P01' || pg === '42703') {
		return 'Database schema is out of date for this code version. Local dev: pnpm db:migrate. Production: set DATABASE_URL to the Railway Postgres URL and run pnpm db:migrate --db prod (includes dashboard command-card columns from migration 0020).';
	}
	return messageForDbConnectionError(e);
}
