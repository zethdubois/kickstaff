/**
 * Which cached ops details a Kickagent command can make stale.
 * The live store applies the result in `noteOpsWrite.ts`.
 */

const WRITE_ROLES = new Set(['write', 'structural', 'shortcut']);

export function isWriteRole(role: string | undefined): boolean {
	return role != null && WRITE_ROLES.has(role);
}

/** `kickagent:gl-hide` and `gl-hide` both name the catalog command. */
export function commandShortName(command: string): string {
	const trimmed = command.trim();
	const colon = trimmed.indexOf(':');
	return colon === -1 ? trimmed : trimmed.slice(colon + 1);
}

/** `--id 4` or `--id=4`. A flag with no value is not an id. */
export function commandTargetId(args: readonly string[]): string | null {
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? '';
		if (arg === '--id') {
			const value = args[i + 1];
			if (!value || value.startsWith('--')) return null;
			return value;
		}
		if (arg.startsWith('--id=')) {
			const value = arg.slice('--id='.length);
			return value || null;
		}
	}
	return null;
}

/**
 * Resource keys named by the command. `gl-hide` → `gl`.
 * `site-units-import-af` → `units`. Longest key first.
 */
export function commandResourceNames(
	command: string,
	resourceNames: readonly string[]
): string[] {
	const name = commandShortName(command).toLowerCase();
	if (!name) return [];
	const hits = resourceNames.filter((raw) => {
		const resource = raw.toLowerCase();
		if (!resource) return false;
		return (
			name === resource ||
			name.startsWith(`${resource}-`) ||
			name.endsWith(`-${resource}`) ||
			name.includes(`-${resource}-`)
		);
	});
	return hits.sort((a, b) => b.length - a.length);
}

/** Null when the command is not a write, or it names no cached resource. */
export function opsWriteTargets(
	command: string,
	args: readonly string[],
	role: string | undefined,
	resourceNames: readonly string[]
): { resources: string[]; id: string | null } | null {
	if (!isWriteRole(role)) return null;
	const resources = commandResourceNames(command, resourceNames);
	if (resources.length === 0) return null;
	return { resources, id: commandTargetId(args) };
}
