import { env } from '$env/dynamic/private';

export type DbTarget = 'dev' | 'prod';

export const DB_TARGET_COOKIE = 'publicweb_db_target';

export type DbDisplayInfo = {
	target: DbTarget;
	label: string;
	host: string;
	database: string;
};

let activeTarget: DbTarget = resolveDefaultTarget();

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === 'production';
}

export function isDbSwitchingEnabled(): boolean {
	return !isProductionRuntime() && !!env.DATABASE_URL_DEV?.trim();
}

function resolveDefaultTarget(): DbTarget {
	if (isProductionRuntime()) return 'prod';
	if (env.DATABASE_URL_DEV?.trim()) return 'dev';
	return 'prod';
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
	if (fromCookie === 'dev' && !env.DATABASE_URL_DEV?.trim()) return;
	await setActiveDbTarget(fromCookie);
}

export function resolveConnectionString(target: DbTarget = getActiveDbTarget()): string {
	if (target === 'dev') {
		const dev = env.DATABASE_URL_DEV?.trim();
		if (!dev) {
			throw new Error('DATABASE_URL_DEV is not set');
		}
		return dev;
	}
	const prod = env.DATABASE_URL?.trim();
	if (!prod) {
		throw new Error('DATABASE_URL is not set');
	}
	return prod;
}

export function getDbDisplayInfo(target: DbTarget = getActiveDbTarget()): DbDisplayInfo {
	const connectionString = resolveConnectionString(target);
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
	const label = `${target} · ${host}/${database}`;
	return { target, label, host, database };
}

let switchPromise: Promise<void> | null = null;

export async function setActiveDbTarget(target: DbTarget): Promise<void> {
	if (isProductionRuntime()) {
		throw new Error('Database target cannot be changed in production');
	}
	if (target === 'dev' && !env.DATABASE_URL_DEV?.trim()) {
		throw new Error('DATABASE_URL_DEV is not set');
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
