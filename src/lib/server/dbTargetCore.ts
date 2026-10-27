/**
 * Shared database target resolution (CLI + server).
 * See docs/guides/database-targeting.md.
 *
 * Defaults (no KICKSTAFF_DB_DEFAULT):
 * - local: `dev` when DATABASE_URL_DEV is set, else `prod`
 * - deploy (NODE_ENV=production): `staging` when Railway env name looks like staging, else `prod`
 *
 * Explicit picks: `/login?db=…`, cookie, KAM `db use`, CLI `--db`.
 */

export type DbTarget = 'dev' | 'staging' | 'prod';

export type DbTargetEnv = {
	nodeEnv?: string;
	/** Railway `RAILWAY_ENVIRONMENT_NAME` / `RAILWAY_ENVIRONMENT` (deploy label only). */
	railwayEnvironment?: string;
	databaseUrlDev?: string;
	databaseUrlStaging?: string;
	databaseUrl?: string;
};

export function envFromProcess(): DbTargetEnv {
	return {
		nodeEnv: process.env.NODE_ENV,
		railwayEnvironment:
			process.env.RAILWAY_ENVIRONMENT_NAME?.trim() ||
			process.env.RAILWAY_ENVIRONMENT?.trim() ||
			undefined,
		databaseUrlDev: process.env.DATABASE_URL_DEV,
		databaseUrlStaging: process.env.DATABASE_URL_STAGING,
		databaseUrl: process.env.DATABASE_URL
	};
}

export function isProductionRuntime(nodeEnv?: string): boolean {
	return nodeEnv === 'production';
}

export function parseDbTarget(value: string | undefined): DbTarget | null {
	if (value === 'dev' || value === 'staging' || value === 'prod') return value;
	return null;
}

/** Map Railway environment name → deploy target (never `dev`). */
export function deployTargetFromRailwayEnvironment(name: string | undefined): DbTarget {
	const n = name?.trim().toLowerCase() ?? '';
	if (!n) return 'prod';
	if (n === 'staging' || n.includes('stag')) return 'staging';
	return 'prod';
}

/**
 * Default target when nothing explicit (`--db`, cookie, `?db=`) is set.
 */
export function getDefaultDbTarget(env: DbTargetEnv): DbTarget {
	if (isProductionRuntime(env.nodeEnv)) {
		return deployTargetFromRailwayEnvironment(env.railwayEnvironment);
	}
	if (env.databaseUrlDev?.trim()) return 'dev';
	return 'prod';
}

/**
 * Staging URL: dedicated DATABASE_URL_STAGING, or on a staging deploy
 * (production + Railway staging env) the env's DATABASE_URL.
 */
export function resolveStagingConnectionString(env: DbTargetEnv): string {
	const staging = env.databaseUrlStaging?.trim();
	if (staging) return staging;
	if (
		isProductionRuntime(env.nodeEnv) &&
		deployTargetFromRailwayEnvironment(env.railwayEnvironment) === 'staging'
	) {
		const primary = env.databaseUrl?.trim();
		if (primary) return primary;
		throw new Error('DATABASE_URL is not set (required for staging deploy)');
	}
	throw new Error('DATABASE_URL_STAGING is not set');
}

export function assertDbTargetAvailable(env: DbTargetEnv, target: DbTarget): void {
	if (target === 'dev') {
		if (!env.databaseUrlDev?.trim()) {
			throw new Error('DATABASE_URL_DEV is not set');
		}
		return;
	}
	if (target === 'staging') {
		resolveStagingConnectionString(env);
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
	if (target === 'staging') {
		return resolveStagingConnectionString(env);
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

/** Kickagent CLI only knows dev|prod; map staging → prod with URL override in spawn env. */
export function toKickagentDbTarget(target: DbTarget): 'dev' | 'prod' {
	return target === 'dev' ? 'dev' : 'prod';
}

// ---------------------------------------------------------------------------
// Per-request target resolution
// ---------------------------------------------------------------------------

/** Pre-auth pages that honor `?db=` (so a login/reset link can pick the database). */
export const DB_QUERY_PATHS = ['/login', '/forgot-password', '/reset-password'] as const;

export type RequestTargetInput = {
	/** Local dev with a dev DB configured (cookie / `?db=` switching allowed). */
	switchingEnabled: boolean;
	pathname: string;
	/** `?db=` query value, if any. */
	dbParam?: string | null;
	/** Preference cookie value, if any. */
	cookie?: string | null;
};

export type RequestTargetResult = {
	target: DbTarget;
	/** True when the target came from `?db=` and the preference cookie should be updated. */
	setCookie: boolean;
	/** `?db=` was present but could not be honored (unknown value or URL not configured). */
	dbParamRejected: boolean;
};

/**
 * Which database does THIS request use?
 *
 * - Deployed runtime (or switching disabled): always the inferred default; no overrides.
 * - Local: `?db=` on pre-auth paths wins, then the preference cookie, then the default.
 * - A target whose URL is not configured is never selected.
 */
export function resolveRequestTarget(env: DbTargetEnv, input: RequestTargetInput): RequestTargetResult {
	const fallback = getDefaultDbTarget(env);
	if (isProductionRuntime(env.nodeEnv) || !input.switchingEnabled) {
		return { target: fallback, setCookie: false, dbParamRejected: false };
	}

	const available = (t: DbTarget | null): t is DbTarget => {
		if (!t) return false;
		try {
			assertDbTargetAvailable(env, t);
			return true;
		} catch {
			return false;
		}
	};

	const paramRaw = input.dbParam?.trim().toLowerCase() || null;
	const onDbQueryPath = (DB_QUERY_PATHS as readonly string[]).includes(input.pathname);
	if (paramRaw && onDbQueryPath) {
		const fromParam = parseDbTarget(paramRaw);
		if (available(fromParam)) {
			return {
				target: fromParam,
				setCookie: fromParam !== (parseDbTarget(input.cookie?.trim().toLowerCase() ?? undefined) ?? null),
				dbParamRejected: false
			};
		}
		const fromCookie = parseDbTarget(input.cookie?.trim().toLowerCase() ?? undefined);
		return {
			target: available(fromCookie) ? fromCookie : fallback,
			setCookie: false,
			dbParamRejected: true
		};
	}

	const fromCookie = parseDbTarget(input.cookie?.trim().toLowerCase() ?? undefined);
	return {
		target: available(fromCookie) ? fromCookie : fallback,
		setCookie: false,
		dbParamRejected: false
	};
}

// ---------------------------------------------------------------------------
// Session policy (one session per database; stricter as stakes rise)
// ---------------------------------------------------------------------------

export type SessionPolicy = {
	/** Hard lifetime from login. */
	absoluteMs: number;
	/** Sign out after this long without a request; null = no idle limit. */
	idleMs: number | null;
	/** false → browser-session cookie (no Max-Age): closing the browser drops it. */
	persistentCookie: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function sessionPolicyForTarget(target: DbTarget): SessionPolicy {
	switch (target) {
		case 'dev':
			return { absoluteMs: 7 * DAY_MS, idleMs: null, persistentCookie: true };
		case 'staging':
			return { absoluteMs: 7 * DAY_MS, idleMs: 8 * HOUR_MS, persistentCookie: true };
		case 'prod':
			return { absoluteMs: 12 * HOUR_MS, idleMs: 30 * 60 * 1000, persistentCookie: false };
	}
}

/** Per-database cookie so a dev session never doubles as a prod session. */
export function sessionCookieName(target: DbTarget): string {
	return `ka_session_${target}`;
}

export const ALL_DB_TARGETS: readonly DbTarget[] = ['dev', 'staging', 'prod'];

export function isSessionIdleExpired(
	lastSeenAt: Date,
	now: Date,
	idleMs: number | null
): boolean {
	if (idleMs === null) return false;
	return now.getTime() - lastSeenAt.getTime() > idleMs;
}

/** Throttle `last_seen_at` writes to at most once per minute per session. */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
