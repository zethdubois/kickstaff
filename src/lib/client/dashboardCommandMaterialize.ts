import { getManifestCommandDefaults } from '$lib/kickagent/manifestCommandCache';

const KICKAGENT_NS = 'kickagent:';

/**
 * After a successful `kickagent:*` run, ensure a hub command card row exists (lazy materialize).
 * Fire-and-forget; failures are logged only.
 */
export async function materializeDashboardCommand(commandKey: string): Promise<void> {
	const key = commandKey.trim().toLowerCase();
	if (!key.startsWith(KICKAGENT_NS)) return;

	const shortName = key.slice(KICKAGENT_NS.length);
	const fromManifest = getManifestCommandDefaults(shortName);
	const defaults = fromManifest
		? {
				label:
					shortName.length > 0
						? shortName.charAt(0).toUpperCase() + shortName.slice(1)
						: shortName,
				description: fromManifest.description,
				category: fromManifest.category,
				sortOrder: fromManifest.sortOrder,
				execution: fromManifest.execution
			}
		: undefined;

	try {
		const res = await fetch('/api/dashboard/materialize-command', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ commandKey: key, defaults })
		});
		if (!res.ok) {
			const data = (await res.json().catch(() => ({}))) as { message?: string };
			console.warn('materialize command card:', data.message ?? res.statusText);
		}
	} catch (err) {
		console.warn('materialize command card:', err);
	}
}
