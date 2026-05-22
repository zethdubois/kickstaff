import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireUser } from '$lib/server/guards';
import { dashboardLinks, userDashboardLinkPreferences } from '$lib/server/schema';

const MAX_LABEL = 512;
const MAX_DESC = 4096;
const MAX_CAT = 128;

function parseHttpUrl(raw: unknown, required: boolean): { ok: true; value: string } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) {
		if (required) return { ok: false, message: 'URL is required.' };
		return { ok: true, value: '' };
	}
	if (s.length > 2048) return { ok: false, message: 'URL is too long.' };
	let u: URL;
	try {
		u = new URL(s);
	} catch {
		return { ok: false, message: 'Invalid URL.' };
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') {
		return { ok: false, message: 'URL must use http:// or https://' };
	}
	return { ok: true, value: s };
}

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals.user);
	const userId = locals.user!.id;
	const db = getDb();

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

	const links = allLinks.map((l) => ({
		...l,
		itemType: l.itemType === 'command' ? ('command' as const) : ('link' as const),
		showOnMyDashboard: !hidden.has(l.id)
	}));

	const selectedLinks = links.filter((l) => l.showOnMyDashboard);
	const hiddenLinks = links.filter((l) => !l.showOnMyDashboard);

	return { selectedLinks, hiddenLinks };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		requireUser(locals.user);

		const form = await request.formData();
		const linkId = String(form.get('link_id') ?? '').trim();
		if (!linkId) return fail(400, { message: 'Link is required.' });

		const label = String(form.get('label') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const category = String(form.get('category') ?? '').trim();
		const sortRaw = String(form.get('sort_order') ?? '').trim();
		const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10);

		if (!label) return fail(400, { message: 'Label is required.' });
		if (label.length > MAX_LABEL) return fail(400, { message: 'Label is too long.' });
		if (description.length > MAX_DESC) return fail(400, { message: 'Description is too long.' });
		if (!category) return fail(400, { message: 'Category is required.' });
		if (category.length > MAX_CAT) return fail(400, { message: 'Category is too long.' });
		if (!Number.isFinite(sort_order) || sort_order < -1000000 || sort_order > 1000000) {
			return fail(400, { message: 'Sort order must be a reasonable number.' });
		}

		const db = getDb();
		const existing = await db
			.select({
				itemType: dashboardLinks.itemType,
				commandKey: dashboardLinks.commandKey
			})
			.from(dashboardLinks)
			.where(eq(dashboardLinks.id, linkId))
			.limit(1);

		if (existing.length === 0) return fail(404, { message: 'Link not found.' });

		const row = existing[0]!;
		const isCommand = row.itemType === 'command';

		let hyperlink: string | null = null;
		if (!isCommand) {
			const href = parseHttpUrl(form.get('hyperlink'), true);
			if (!href.ok) return fail(400, { message: href.message });
			hyperlink = href.value;
		}

		const now = new Date();
		const updated = await db
			.update(dashboardLinks)
			.set({
				...(hyperlink !== null ? { hyperlink } : {}),
				label,
				description,
				category,
				sortOrder: sort_order,
				updatedAt: now
			})
			.where(eq(dashboardLinks.id, linkId))
			.returning({ id: dashboardLinks.id });

		if (updated.length === 0) return fail(404, { message: 'Link not found.' });

		return { ok: true as const };
	},

	delete: async ({ request, locals }) => {
		requireUser(locals.user);

		const form = await request.formData();
		const linkId = String(form.get('link_id') ?? '').trim();
		if (!linkId) return fail(400, { message: 'Link is required.' });

		const db = getDb();
		const deleted = await db.delete(dashboardLinks).where(eq(dashboardLinks.id, linkId)).returning({ id: dashboardLinks.id });
		if (deleted.length === 0) return fail(404, { message: 'Link not found.' });

		return { ok: true as const };
	},

	toggle: async ({ request, locals }) => {
		requireUser(locals.user);
		const userId = locals.user!.id;

		const form = await request.formData();
		const linkId = String(form.get('link_id') ?? '').trim();
		const show = String(form.get('show') ?? '') === '1';

		if (!linkId) return fail(400, { message: 'Link is required.' });

		const db = getDb();

		await db
			.delete(userDashboardLinkPreferences)
			.where(
				and(eq(userDashboardLinkPreferences.userId, userId), eq(userDashboardLinkPreferences.linkId, linkId))
			);

		if (!show) {
			await db.insert(userDashboardLinkPreferences).values({
				userId,
				linkId,
				enabled: false
			});
		}

		return { ok: true as const };
	}
};
