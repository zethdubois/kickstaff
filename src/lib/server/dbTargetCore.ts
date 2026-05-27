/**
 * Shared database target resolution (CLI + server).
 * Mirrors kickagent `src/db/dbTarget.ts` — see docs/guides/database-targeting.md.
 */

export type DbTarget = 'dev' | 'prod';

export type DbTargetEnv = {
	nodeEnv?: string;
	/** PUBLICWEB_DB_DEFAULT — explicit default when not production */
	dbDefault?: string;
	databaseUrlDev?: string;
	databaseUrl?: string;
};

export function envFromProcess(): DbTargetEnv {
	return {
		nodeEnv: process.env.NODE_ENV,
		dbDefault: process.env.PUBLICWEB_DB_DEFAULT,
		databaseUrlDev: process.env.DATABASE_URL_DEV,
		databaseUrl: process.env.DATABASE_URL
	};
}

export function isProductionRuntime(nodeEnv?: string): boolean {
	return nodeEnv === 'production';
}

export function parseDbTarget(value: string | undefined): DbTarget | null {
	if (value === 'dev' || value === 'prod') return value;
	return null;
}

export function getConfiguredDefaultTarget(env: DbTargetEnv): DbTarget | null {
	const raw = env.dbDefault?.trim().toLowerCase();
	if (!raw) return null;
	const parsed = parseDbTarget(raw);
	if (!parsed) {
		throw new Error(`PUBLICWEB_DB_DEFAULT must be "dev" or "prod" (got "${raw}")`);
	}
	if (isProductionRuntime(env.nodeEnv) && parsed === 'dev') {
		return 'prod';
	}
	return parsed;
}

export function getDefaultDbTarget(env: DbTargetEnv): DbTarget {
	if (isProductionRuntime(env.nodeEnv)) return 'prod';
	const configured = getConfiguredDefaultTarget(env);
	if (configured) return configured;
	if (env.databaseUrlDev?.trim()) return 'dev';
	return 'prod';
}

export function assertDbTargetAvailable(env: DbTargetEnv, target: DbTarget): void {
	if (target === 'dev') {
		if (!env.databaseUrlDev?.trim()) {
			throw new Error('DATABASE_URL_DEV is not set');
		}
		return;
	}
	if (!env.databaseUrl?.trim()) {
		throw new Error('DATABASE_URL is not set');
	}
}

export function resolveConnectionStringFromEnv(env: DbTargetEnv, target: DbTarget): string {
	assertDbTargetAvailable(env, target);
	if (target === 'dev') {
		return env.databaseUrlDev!.trim();
	}
	return env.databaseUrl!.trim();
}

export function getDbDisplayInfoFromEnv(
	env: DbTargetEnv,
	target: DbTarget
): { target: DbTarget; label: string; host: string; database: string } {
	const connectionString = resolveConnectionStringFromEnv(env, target);
	let host = 'unknown';
	let database = 'unknown';
	try {
		const url = new URL(connectionString);
		host = url.hostname + (url.port ? `:${url.port}` : '');
		database = url.pathname.replace(/^\//, '') || 'postgres';
	} catch {
		host = '(invalid url)';
		database = '?';
	}
	return { target, label: `${target} · ${host}/${database}`, host, database };
}
