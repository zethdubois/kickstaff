import { eq } from 'drizzle-orm';
import { opsResourceLinks } from '$lib/kickagent/opsResources';
import type { ManifestResources } from '$lib/kickagent/manifestResourceCache';
import { getDb } from '$lib/server/db';
import { dashboardLinks } from '$lib/server/schema';

const CATEGORY = 'Kickagent Resources';

/** Stable command key so reloads do not insert a second row. Not a runnable command. */
export function opsResourceDashboardKey(name: string): string {
	return `kickagent:resource:${name}`;
}

/**
 * Insert a Kickagent-category link for each manifest resource that has an ops page.
 * Rows this host owns (`kickagent:resource:<name>`) are updated so the label stays the resource key.
 */
export async function ensureOpsResourceDashboardLinks(
	resources: ManifestResources | null
): Promise<void> {
	const links = opsResourceLinks(resources);
	if (links.length === 0) return;

	const db = getDb();
	const now = new Date();
	for (const [index, link] of links.entries()) {
		const commandKey = opsResourceDashboardKey(link.name);
		const values = {
			hyperlink: link.href,
			label: link.label,
			description: `Open ${link.label} (${link.href}).`,
			category: CATEGORY,
			sortOrder: index,
			updatedAt: now
		};
		const existing = await db
			.select({ id: dashboardLinks.id })
			.from(dashboardLinks)
			.where(eq(dashboardLinks.commandKey, commandKey))
			.limit(1);
		if (existing.length > 0) {
			await db.update(dashboardLinks).set(values).where(eq(dashboardLinks.id, existing[0]!.id));
			continue;
		}

		await db.insert(dashboardLinks).values({
			itemType: 'link',
			commandKey,
			...values
		});
	}
}
