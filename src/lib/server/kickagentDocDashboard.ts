import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	KICKAGENT_DOC_SURFACES,
	kickagentDocDashboardKey,
	kickagentDocSurfaceIsServed
} from '$lib/server/kickagentDocSurfaces';
import { resolveKickagentApiBaseUrl } from '$lib/server/kickagentRemoteRun';
import { getDb } from '$lib/server/db';
import { dashboardLinks } from '$lib/server/schema';

const CATEGORY = 'Kickagent Docs';

/**
 * Wiki and progress cards, only while those paths answer on the kickagent origin.
 * A path that is down drops its card on the next dashboard load.
 */
export async function ensureKickagentDocDashboardLinks(): Promise<void> {
	const base = resolveKickagentApiBaseUrl();
	const token =
		env.KICKAGENT_SERVICE_TOKEN?.trim() ?? process.env.KICKAGENT_SERVICE_TOKEN?.trim() ?? null;
	const db = getDb();
	const now = new Date();

	for (const [index, doc] of KICKAGENT_DOC_SURFACES.entries()) {
		const commandKey = kickagentDocDashboardKey(doc.name);
		const served = base
			? await kickagentDocSurfaceIsServed(base, doc.href, token)
			: false;
		const existing = await db
			.select({ id: dashboardLinks.id })
			.from(dashboardLinks)
			.where(eq(dashboardLinks.commandKey, commandKey))
			.limit(1);

		if (!served) {
			if (existing.length > 0) {
				await db.delete(dashboardLinks).where(eq(dashboardLinks.id, existing[0]!.id));
			}
			continue;
		}

		const values = {
			hyperlink: doc.href,
			label: doc.name,
			description: `Open ${doc.name} (${doc.href}).`,
			category: CATEGORY,
			sortOrder: index,
			updatedAt: now
		};
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
