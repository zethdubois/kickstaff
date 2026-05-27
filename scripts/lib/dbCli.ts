/**
 * CLI database target resolution (dotenv-loaded scripts).
 * Uses shared logic in dbTargetCore.ts (aligned with kickagent KICKAGENT_DB_DEFAULT).
 */

import {
	envFromProcess,
	getDbDisplayInfoFromEnv,
	getDefaultDbTarget,
	resolveConnectionStringFromEnv,
	type DbTarget
} from '../../src/lib/server/dbTargetCore.ts';

export type CliDbTarget = DbTarget;

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
