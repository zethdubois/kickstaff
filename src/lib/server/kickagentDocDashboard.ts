import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
	KICKAGENT_DOC_SURFACES,
	kickagentDocDashboardKey,
	kickagentDocProbes,
	kickagentDocSurfaceIsServed,
	type KickagentDocSurfaceName
} from '$lib/server/kickagentDocSurfaces';
import { resolveKickagentApiBaseUrl } from '$lib/server/kickagentRemoteRun';
import { getDb } from '$lib/server/db';
import { dashboardLinks } from '$lib/server/schema';

const CATEGORY = 'Kickagent Docs';

/**
 * Wiki and progress cards while a probe answers.
 * Publish-origin `/wiki` and `/progress` win. Otherwise the local servers
 * at 7097 and 7095. A surface that is down drops its card on the next load.
 */
export async function ensureKickagentDocDashboardLinks(): Promise<void> {
	const token =
		env.KICKAGENT_SERVICE_TOKEN?.trim() ?? process.env.KICKAGENT_SERVICE_TOKEN?.trim() ?? null;
	const probes = kickagentDocProbes({ publishOrigin: resolveKickagentApiBaseUrl() });
	const db = getDb();
	const now = new Date();

	for (const [index, name] of KICKAGENT_DOC_SURFACES.entries()) {
		const commandKey = kickagentDocDashboardKey(name);
		const hit = await firstServedDoc(name, probes, token);
		const existing = await db
			.select({ id: dashboardLinks.id })
			.from(dashboardLinks)
			.where(eq(dashboardLinks.commandKey, commandKey))
			.limit(1);

		if (!hit) {
			if (existing.length > 0) {
				await db.delete(dashboardLinks).where(eq(dashboardLinks.id, existing[0]!.id));
			}
			continue;
		}

		const values = {
			hyperlink: hit.href,
			label: name,
			description: `Open ${name} (${hit.href}).`,
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

async function firstServedDoc(
	name: KickagentDocSurfaceName,
	probes: ReturnType<typeof kickagentDocProbes>,
	token: string | null
) {
	for (const probe of probes) {
		if (probe.name !== name) continue;
		const served = await kickagentDocSurfaceIsServed(
			probe.probeUrl,
			probe.sendToken ? token : null
		);
		if (served) return probe;
	}
	return null;
}
