/**
 * After a write command succeeds, drop the cached detail it may have changed.
 * Query commands, including list and show, leave the book alone.
 */
import { devConsole } from '$lib/devConsole/state.svelte';
import { getManifestCommandDefaults } from '$lib/kickagent/manifestCommandCache';
import { listCachedResourceKeys } from '$lib/kickagent/manifestResourceCache';
import { invalidateOpsDetails } from './opsListCache.svelte';
import { commandShortName, opsWriteTargets } from './opsWriteCache';

export function noteOpsWrite(
	command: string,
	args: readonly string[],
	outcome?: { level?: string }
): void {
	if (outcome?.level === 'error') return;
	const role = getManifestCommandDefaults(commandShortName(command))?.role;
	const target = opsWriteTargets(command, args, role, listCachedResourceKeys());
	if (!target) return;
	const dataset = devConsole.dbStatus?.target ?? null;
	for (const resource of target.resources) {
		invalidateOpsDetails(resource, dataset, target.id);
	}
}
