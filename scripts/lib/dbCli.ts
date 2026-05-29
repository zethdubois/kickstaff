/**
 * CLI database target resolution (dotenv-loaded scripts).
 * Uses shared logic in dbTargetCore.ts (aligned with kickagent KICKAGENT_DB_DEFAULT).
 *
 * Explicit target: `pnpm db:<cmd> --db prod` or `pnpm db:<cmd> prod`
 */

import {
	envFromProcess,
	getDbDisplayInfoFromEnv,
	getDefaultDbTarget,
	parseDbTarget,
	resolveConnectionStringFromEnv,
	type DbTarget
} from '../../src/lib/server/dbTargetCore.ts';

export type CliDbTarget = DbTarget;

const CLI_DB_USAGE = 'usage: pnpm db:<cmd> [--db dev|prod] [dev|prod]';

export type ParsedCliDbArgv = {
	argv: string[];
	/** Set when `--db` or a positional `dev`/`prod` was passed. */
	dbTarget: CliDbTarget | null;
	/** True when target came from argv, not env default. */
	explicit: boolean;
};

/** Strip `--db dev|prod` and optional positional `dev|prod`; mirrors kickagent parseDbArgv. */
export function parseCliDbArgv(argv: string[]): ParsedCliDbArgv {
	const rest: string[] = [];
	let dbTarget: CliDbTarget | null = null;
	let explicit = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (arg === '--db' && argv[i + 1]) {
			const parsed = parseDbTarget(argv[i + 1]!.toLowerCase());
			if (!parsed) {
				throw new Error(CLI_DB_USAGE);
			}
			dbTarget = parsed;
			explicit = true;
			i++;
			continue;
		}
		rest.push(arg);
	}

	if (!explicit && rest.length > 0) {
		const positional = parseDbTarget(rest[0]!.toLowerCase());
		if (positional) {
			dbTarget = positional;
			explicit = true;
			rest.shift();
		}
	}

	return { argv: rest, dbTarget, explicit };
}

/** Precedence: `--db` / positional > env default. */
export function resolveCliDbTarget(argv: string[] = []): CliDbTarget {
	const { dbTarget } = parseCliDbArgv(argv);
	return dbTarget ?? getDefaultCliDbTarget();
}

export function getDefaultCliDbTarget(): CliDbTarget {
	return getDefaultDbTarget(envFromProcess());
}

export function resolveCliConnectionString(target: CliDbTarget = getDefaultCliDbTarget()): string {
	return resolveConnectionStringFromEnv(envFromProcess(), target);
}

export function getCliDbDisplayInfo(target: CliDbTarget = getDefaultCliDbTarget()): {
	target: CliDbTarget;
	label: string;
	host: string;
	database: string;
} {
	return getDbDisplayInfoFromEnv(envFromProcess(), target);
}

/** Warn when argv explicitly selected prod (status / migrate-status). */
export function warnIfExplicitProdCliTarget(argv: string[] = []): void {
	const { dbTarget, explicit } = parseCliDbArgv(argv);
	const effective = dbTarget ?? getDefaultCliDbTarget();
	if (explicit && effective === 'prod') {
		console.warn('⚠ Using PRODUCTION database (DATABASE_URL)');
	}
}

/** Warn whenever effective target is prod (migrate). */
export function warnIfProdMigrateTarget(target: CliDbTarget): void {
	if (target === 'prod') {
		console.warn('⚠ Applying migrations to PRODUCTION (DATABASE_URL)');
	}
}
