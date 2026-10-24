/** Phase 2: manifest `commands[]` cached after plugin load (client-only). */

/**
 * What a command is for (manifest `role`). Only `structural` commands are button candidates.
 * `shortcut` effects are already expressed by a `write` command's fields, so hosts skip them.
 */
export type ManifestCommandRole = 'query' | 'write' | 'structural' | 'shortcut';

export const MANIFEST_COMMAND_ROLES: readonly ManifestCommandRole[] = [
	'query',
	'write',
	'structural',
	'shortcut'
];

export type CachedManifestCommand = {
	name: string;
	description: string;
	category: string;
	execution: 'local' | 'remote';
	sortOrder?: number;
	role?: ManifestCommandRole;
	/** Set when `role` is `shortcut`: the `write` command that already expresses the effect. */
	sugarFor?: string;
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

/** Commands a host may draw as buttons: `structural` only. Shortcuts and unclassified are skipped. */
export function listButtonCandidateCommands(
	commands: readonly CachedManifestCommand[]
): CachedManifestCommand[] {
	return commands.filter((c) => c.role === 'structural');
}
