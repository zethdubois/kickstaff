import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, asc, eq } from 'drizzle-orm';
import { describeDbFailure, messageForDbError } from '$lib/server/dbErrors';
import { getDb } from '$lib/server/db';
import { dashboardLinks, userDashboardLinkPreferences } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const db = getDb();

	try {
		return await loadDashboard(user.id, db);
	} catch (e) {
		console.error('[dashboard load]', e);
		const hint = messageForDbError(e);
		throw error(hint ? 503 : 500, hint ?? describeDbFailure(e));
	}
};

async function loadDashboard(
	userId: string,
	db: ReturnType<typeof getDb>
) {
	const allLinks = await db
		.select()
		.from(dashboardLinks)
		.orderBy(asc(dashboardLinks.category), asc(dashboardLinks.sortOrder), asc(dashboardLinks.label));

	const hiddenRows = await db
		.select({ linkId: userDashboardLinkPreferences.linkId })
		.from(userDashboardLinkPreferences)
		.where(
			and(
				eq(userDashboardLinkPreferences.userId, userId),
				eq(userDashboardLinkPreferences.enabled, false)
			)
		);

	const hidden = new Set(hiddenRows.map((r) => r.linkId));
	const visible = allLinks.filter((l) => !hidden.has(l.id));

	/** Category order: by minimum sort_order in category, then name */
	const catOrder = new Map<string, number>();
	for (const l of visible) {
		const cur = catOrder.get(l.category);
		if (cur === undefined || l.sortOrder < cur) {
			catOrder.set(l.category, l.sortOrder);
		}
	}
	const categories = [...new Set(visible.map((l) => l.category))].sort((a, b) => {
		const oa = catOrder.get(a) ?? 0;
		const ob = catOrder.get(b) ?? 0;
		if (oa !== ob) return oa - ob;
		return a.localeCompare(b);
	});

	const columns = categories.map((category) => ({
		category,
		links: visible
			.filter((l) => l.category === category)
			.map((l) => ({
				id: l.id,
				label: l.label,
				description: l.description,
				category: l.category,
				sortOrder: l.sortOrder,
				itemType: (l.itemType === 'command' ? 'command' : 'link') as 'link' | 'command',
				hyperlink: l.hyperlink ?? undefined,
				commandKey: l.commandKey ?? undefined,
				execution: undefined as 'local' | 'remote' | undefined
			}))
	}));

	return { dashboardColumns: columns };
};
