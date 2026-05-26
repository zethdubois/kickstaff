export function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === 'production';
}

export function isDevDatabaseConfigured(devUrl?: string | undefined): boolean {
	return !!(devUrl?.trim() || process.env.DATABASE_URL_DEV?.trim());
}

/** Local dev server with a dev database URL (inspection APIs + target switching). */
export function isLocalDevDatabaseFeaturesEnabled(devUrl?: string | undefined): boolean {
	return !isProductionRuntime() && isDevDatabaseConfigured(devUrl);
}
