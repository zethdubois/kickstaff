import { env } from '$env/dynamic/public';
import type { CommandCatalogDefaults } from '$lib/server/dashboardCommandTypes';

type ManifestCommandJson = {
	name: string;
	description?: string;
	category?: string;
	execution?: string;
	sortOrder?: number;
};

const PHASE1_PLUGIN_DEFAULTS: Record<string, CommandCatalogDefaults> = {
	hello: {
		label: 'Hello',
		description: 'Hello world demo (Phase 2 plugin)',
		category: 'Kickagent',
		sortOrder: 0,
		execution: 'local'
	},
	foo: {
		label: 'Foo',
		description: 'Demo command for per-file catalog pattern',
		category: 'Kickagent',
		sortOrder: 10,
		execution: 'local'
	}
};

let manifestCache: { url: string; byName: Map<string, CommandCatalogDefaults> } | null =
	null;

function defaultsFromManifestRow(row: ManifestCommandJson): CommandCatalogDefaults | null {
	const name = row.name?.trim();
	const category = row.category?.trim();
	if (!name || !category) return null;
	const execution = row.execution;
	if (execution !== 'local' && execution !== 'remote') return null;
	const label = name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;
	return {
		label,
		description: typeof row.description === 'string' ? row.description.trim() : '',
		category,
		sortOrder:
			typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder) ? row.sortOrder : 0,
		execution
	};
}

async function loadManifestCatalog(url: string): Promise<Map<string, CommandCatalogDefaults>> {
	const res = await fetch(url, { headers: { accept: 'application/json' } });
	if (!res.ok) {
		throw new Error(`manifest fetch failed: ${res.status} ${res.statusText}`);
	}
	const raw = (await res.json()) as { commands?: unknown };
	const byName = new Map<string, CommandCatalogDefaults>();
	if (!Array.isArray(raw.commands)) return byName;
	for (const row of raw.commands) {
		if (!row || typeof row !== 'object') continue;
		const parsed = defaultsFromManifestRow(row as ManifestCommandJson);
		if (parsed) byName.set((row as ManifestCommandJson).name.trim(), parsed);
	}
	return byName;
}

async function getManifestByName(): Promise<Map<string, CommandCatalogDefaults> | null> {
	const url = env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim();
	if (!url) return null;
	if (manifestCache?.url === url) return manifestCache.byName;
	const byName = await loadManifestCatalog(url);
	manifestCache = { url, byName };
	return byName;
}

/** Resolve hub/command-card metadata without a kickagent npm dependency. */
export async function getKickagentCatalogDefaults(
	shortName: string
): Promise<CommandCatalogDefaults | null> {
	const key = shortName.trim();
	if (!key) return null;

	try {
		const fromManifest = await getManifestByName();
		if (fromManifest?.has(key)) return fromManifest.get(key)!;
	} catch {
		/* fall through to Phase 1 static defaults */
	}

	return PHASE1_PLUGIN_DEFAULTS[key] ?? null;
}
