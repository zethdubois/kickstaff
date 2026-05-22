/** Phase 2: manifest `commands[]` cached after plugin load (client-only). */

export type CachedManifestCommand = {
	name: string;
	description: string;
	category: string;
	execution: 'local' | 'remote';
	sortOrder?: number;
};

let cached: CachedManifestCommand[] | null = null;

export function setManifestCommandCache(commands: CachedManifestCommand[]): void {
	cached = commands;
}

export function clearManifestCommandCache(): void {
	cached = null;
}

export function getManifestCommandDefaults(shortName: string): CachedManifestCommand | null {
	if (!cached) return null;
	const key = shortName.trim().toLowerCase();
	return cached.find((c) => c.name.toLowerCase() === key) ?? null;
}
