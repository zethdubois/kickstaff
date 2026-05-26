import { env } from '$env/dynamic/private';
import { isLocalDevDatabaseFeaturesEnabled } from '$lib/server/runtimeEnv';

/** Read-only DB inspection APIs are for local dev server only (not deployed production runtime). */
export function isDevDatabaseInspectionEnabled(): boolean {
	return isLocalDevDatabaseFeaturesEnabled(env.DATABASE_URL_DEV);
}

export function devDatabaseInspectionDisabledMessage(): string {
	return 'Database inspection is only available in local development';
}
