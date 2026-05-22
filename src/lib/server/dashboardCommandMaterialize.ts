import { eq } from 'drizzle-orm';
import { COMMAND_CATALOG } from 'kickagent';
import { getDb } from '$lib/server/db';
import { dashboardLinks, type DashboardItemType } from '$lib/server/schema';

const KICKAGENT_NS = 'kickagent:';
const MAX_LABEL = 512;
const MAX_DESC = 4096;
const MAX_CAT = 128;

export type CommandCatalogDefaults = {
	label: string;
	description: string;
	category: string;
	sortOrder: number;
	execution?: 'local' | 'remote';
};

export type EnsureDashboardCommandResult = {
	linkId: string;
	created: boolean;
};

/** Parse and validate a namespaced command key (e.g. `kickagent:hello`). */
export function parseCommandKey(commandKey: string): { ok: true; key: string } | { ok: false; message: string } {
	const key = commandKey.trim().toLowerCase();
	if (!key) return { ok: false, message: 'commandKey is required.' };
	if (!/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(key)) {
		return { ok: false, message: 'commandKey must look like namespace:command (e.g. kickagent:hello).' };
	}
	return { ok: true, key };
}

/** Defaults from linked kickagent COMMAND_CATALOG (Phase 1). */
export function getKickagentCatalogDefaults(shortName: string): CommandCatalogDefaults | null {
	const cmd = COMMAND_CATALOG.find((c) => c.name === shortName);
	if (!cmd) return null;
	const label =
		cmd.name.length > 0 ? cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1) : cmd.name;
	return {
		label,
		description: cmd.description,
		category: cmd.category,
		sortOrder: cmd.sortOrder ?? 0,
		execution: cmd.execution
	};
}

export function resolveCommandCatalogDefaults(
	commandKey: string,
	override?: Partial<CommandCatalogDefaults> | null
): CommandCatalogDefaults | null {
	const parsed = parseCommandKey(commandKey);
	if (!parsed.ok) return null;

	let base: CommandCatalogDefaults | null = null;
	if (parsed.key.startsWith(KICKAGENT_NS)) {
		const shortName = parsed.key.slice(KICKAGENT_NS.length);
		base = getKickagentCatalogDefaults(shortName);
	}

	if (!base && !override) return null;

	const merged: CommandCatalogDefaults = {
		label: override?.label?.trim() || base?.label || parsed.key,
		description: override?.description?.trim() ?? base?.description ?? '',
		category: override?.category?.trim() || base?.category || 'Uncategorized',
		sortOrder: override?.sortOrder ?? base?.sortOrder ?? 0,
		execution: override?.execution ?? base?.execution
	};

	if (merged.label.length > MAX_LABEL || merged.category.length > MAX_CAT || merged.description.length > MAX_DESC) {
		return null;
	}
	if (!merged.category) return null;

	return merged;
}

/**
 * Idempotent: ensure a dashboard_links row exists for a command card.
 * User-edited rows are left unchanged when already present.
 */
export async function ensureDashboardCommandRow(
	commandKey: string,
	override?: Partial<CommandCatalogDefaults> | null
): Promise<EnsureDashboardCommandResult | { message: string }> {
	const parsed = parseCommandKey(commandKey);
	if (!parsed.ok) return { message: parsed.message };

	const defaults = resolveCommandCatalogDefaults(parsed.key, override);
	if (!defaults) {
		return { message: `Unknown command or missing catalog metadata: ${parsed.key}` };
	}

	const db = getDb();
	const existing = await db
		.select({ id: dashboardLinks.id })
		.from(dashboardLinks)
		.where(eq(dashboardLinks.commandKey, parsed.key))
		.limit(1);

	if (existing.length > 0) {
		return { linkId: existing[0]!.id, created: false };
	}

	const now = new Date();
	const inserted = await db
		.insert(dashboardLinks)
		.values({
			itemType: 'command' satisfies DashboardItemType,
			commandKey: parsed.key,
			hyperlink: null,
			label: defaults.label,
			description: defaults.description,
			category: defaults.category,
			sortOrder: defaults.sortOrder,
			updatedAt: now
		})
		.returning({ id: dashboardLinks.id });

	return { linkId: inserted[0]!.id, created: true };
}
