/**
 * CLI database target resolution (dotenv-loaded scripts).
 * Mirrors server logic in src/lib/server/dbTarget.ts using process.env.
 */

export type CliDbTarget = 'dev' | 'prod';

export function getDefaultCliDbTarget(): CliDbTarget {
	if (process.env.NODE_ENV === 'production') return 'prod';
	if (process.env.DATABASE_URL_DEV?.trim()) return 'dev';
	return 'prod';
}

export function resolveCliConnectionString(target: CliDbTarget = getDefaultCliDbTarget()): string {
	if (target === 'dev') {
		const dev = process.env.DATABASE_URL_DEV?.trim();
		if (!dev) {
			throw new Error('DATABASE_URL_DEV is not set');
		}
		return dev;
	}
	const prod = process.env.DATABASE_URL?.trim();
	if (!prod) {
		throw new Error('DATABASE_URL is not set');
	}
	return prod;
}

export function getCliDbDisplayInfo(target: CliDbTarget = getDefaultCliDbTarget()): {
	target: CliDbTarget;
	label: string;
	host: string;
	database: string;
} {
	const connectionString = resolveCliConnectionString(target);
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
