import { env } from '$env/dynamic/private';
import { isLocalDevDatabaseFeaturesEnabled, isProductionRuntime } from '$lib/server/runtimeEnv';
import {
	getDefaultDbTarget,
	getDbDisplayInfoFromEnv,
	resolveConnectionStringFromEnv,
	type DbTarget,
	type DbTargetEnv
} from './dbTargetCore';

export type { DbTarget };

export const DB_TARGET_COOKIE = 'publicweb_db_target';

export type DbDisplayInfo = {
	target: DbTarget;
	label: string;
	host: string;
	database: string;
};

function readDbTargetEnv(): DbTargetEnv {
	return {
		nodeEnv: process.env.NODE_ENV,
		dbDefault: env.PUBLICWEB_DB_DEFAULT ?? process.env.PUBLICWEB_DB_DEFAULT,
		databaseUrlDev: env.DATABASE_URL_DEV,
		databaseUrl: env.DATABASE_URL
	};
}

let activeTarget: DbTarget = getDefaultDbTarget(readDbTargetEnv());

export function isDbSwitchingEnabled(): boolean {
	return isLocalDevDatabaseFeaturesEnabled(env.DATABASE_URL_DEV);
}

export function getActiveDbTarget(): DbTarget {
	if (isProductionRuntime()) return 'prod';
	return activeTarget;
}

export function parseDbTargetCookie(value: string | undefined): DbTarget | null {
	if (value === 'dev' || value === 'prod') return value;
	return null;
}

export async function syncDbTargetFromCookie(cookieValue: string | undefined): Promise<void> {
	if (isProductionRuntime()) return;
	const fromCookie = parseDbTargetCookie(cookieValue);
	if (!fromCookie) return;
	if (fromCookie === activeTarget) return;
	const dbEnv = readDbTargetEnv();
	if (fromCookie === 'dev' && !dbEnv.databaseUrlDev?.trim()) return;
	await setActiveDbTarget(fromCookie);
}

export function resolveConnectionString(target: DbTarget = getActiveDbTarget()): string {
	return resolveConnectionStringFromEnv(readDbTargetEnv(), target);
}

export function getDbDisplayInfo(target: DbTarget = getActiveDbTarget()): DbDisplayInfo {
	return getDbDisplayInfoFromEnv(readDbTargetEnv(), target);
}

let switchPromise: Promise<void> | null = null;

export async function setActiveDbTarget(target: DbTarget): Promise<void> {
	if (isProductionRuntime()) {
		throw new Error('Database target cannot be changed in production');
	}
	const dbEnv = readDbTargetEnv();
	try {
		resolveConnectionStringFromEnv(dbEnv, target);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Invalid database target';
		throw new Error(message);
	}
	if (target === activeTarget) return;

	const run = async () => {
		activeTarget = target;
		const { resetDbPool } = await import('./db');
		await resetDbPool();
	};

	if (switchPromise) {
		await switchPromise;
	}
	switchPromise = run();
	try {
		await switchPromise;
	} finally {
		switchPromise = null;
	}
}
