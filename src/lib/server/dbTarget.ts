import { AsyncLocalStorage } from 'node:async_hooks';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isLocalDevDatabaseFeaturesEnabled, isProductionRuntime } from '$lib/server/runtimeEnv';
import {
	getDefaultDbTarget,
	getDbDisplayInfoFromEnv,
	resolveConnectionStringFromEnv,
	resolveRequestTarget,
	type DbTarget,
	type DbTargetEnv,
	type RequestTargetResult
} from './dbTargetCore';

export type { DbTarget };
export { parseDbTarget, toKickagentDbTarget } from './dbTargetCore';

/** Preference cookie: which database this browser is pointed at (not a credential). */
export const DB_TARGET_COOKIE = 'kickstaff_db_target';

export type DbDisplayInfo = {
	target: DbTarget;
	label: string;
	host: string;
	database: string;
};

function readDbTargetEnv(): DbTargetEnv {
	return {
		nodeEnv: process.env.NODE_ENV,
		railwayEnvironment:
			process.env.RAILWAY_ENVIRONMENT_NAME?.trim() ||
			process.env.RAILWAY_ENVIRONMENT?.trim() ||
			undefined,
		databaseUrlDev: env.DATABASE_URL_DEV,
		databaseUrlStaging: env.DATABASE_URL_STAGING ?? process.env.DATABASE_URL_STAGING,
		databaseUrl: env.DATABASE_URL
	};
}

/**
 * The database a request runs against. Set per request in hooks (AsyncLocalStorage),
 * so two people on one server can use different databases without stepping on each other.
 */
const targetStore = new AsyncLocalStorage<DbTarget>();

export function runWithDbTarget<T>(target: DbTarget, fn: () => T): T {
	return targetStore.run(target, fn);
}

/** Local dev with a dev DB configured: cookie / `?db=` / KAM `db use` may change the target. */
export function isDbSwitchingEnabled(): boolean {
	return isLocalDevDatabaseFeaturesEnabled(env.DATABASE_URL_DEV);
}

export function getActiveDbTarget(): DbTarget {
	if (isProductionRuntime()) {
		return getDefaultDbTarget(readDbTargetEnv());
	}
	return targetStore.getStore() ?? getDefaultDbTarget(readDbTargetEnv());
}

export function resolveConnectionString(target: DbTarget = getActiveDbTarget()): string {
	return resolveConnectionStringFromEnv(readDbTargetEnv(), target);
}

export function getDbDisplayInfo(target: DbTarget = getActiveDbTarget()): DbDisplayInfo {
	return getDbDisplayInfoFromEnv(readDbTargetEnv(), target);
}

/** Is this target's connection string configured on this server? */
export function isDbTargetAvailable(target: DbTarget): boolean {
	try {
		resolveConnectionStringFromEnv(readDbTargetEnv(), target);
		return true;
	} catch {
		return false;
	}
}

/** Decide the target for an incoming request (see `resolveRequestTarget`). */
export function resolveTargetForRequest(input: {
	pathname: string;
	dbParam: string | null;
	cookie: string | undefined;
}): RequestTargetResult {
	return resolveRequestTarget(readDbTargetEnv(), {
		switchingEnabled: isDbSwitchingEnabled(),
		pathname: input.pathname,
		dbParam: input.dbParam,
		cookie: input.cookie
	});
}

export function setDbTargetCookie(cookies: Cookies, url: URL, target: DbTarget): void {
	cookies.set(DB_TARGET_COOKIE, target, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 365
	});
}
