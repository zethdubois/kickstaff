import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { cities, isCitySlug } from '$lib/cities';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { rentalLandingLinks } from '$lib/server/schema';

const MAX_URL_LEN = 2048;
const MAX_PROPERTY_GROUP_LEN = 256;
const MAX_ORDER_BY_LEN = 64;

function parseOptionalPropertyGroup(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_PROPERTY_GROUP_LEN) {
		return { ok: false, message: 'Property group name is too long.' };
	}
	return { ok: true, value: s };
}

function parseOptionalThemeColor(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > 32) return { ok: false, message: 'Theme color is too long.' };
	if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
		return { ok: false, message: 'Theme color must be a hex value like #95bb3e.' };
	}
	return { ok: true, value: s };
}

function parseOptionalOrderBy(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_ORDER_BY_LEN) return { ok: false, message: 'Sort order value is too long.' };
	if (!/^[a-zA-Z0-9_]+$/.test(s)) {
		return { ok: false, message: 'Sort order may only contain letters, numbers, and underscores.' };
	}
	return { ok: true, value: s };
}

function parseOptionalHttpsUrl(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_URL_LEN) {
		return { ok: false, message: 'A URL exceeds the maximum length.' };
	}
	let u: URL;
	try {
		u = new URL(s);
	} catch {
		return { ok: false, message: 'Invalid URL.' };
	}
	if (u.protocol !== 'https:') {
		return { ok: false, message: 'URLs must use https://' };
	}
	return { ok: true, value: s };
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const rows = await db.select().from(rentalLandingLinks);
	const bySlug = new Map(rows.map((r) => [r.citySlug, r]));

	return {
		cities: cities.map(({ slug, label }) => {
			const row = bySlug.get(slug);
			return {
				slug,
				label,
				shortTermUrl: row?.shortTermUrl ?? '',
				longTermUrl: row?.longTermUrl ?? '',
				applyUrl: row?.applyUrl ?? '',
				contactUrl: row?.contactUrl ?? '',
				listingPropertyGroup: row?.listingPropertyGroup ?? '',
				listingThemeColor: row?.listingThemeColor ?? '',
				listingOrderBy: row?.listingOrderBy ?? ''
			};
		})
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		requireAdmin(locals.user);

		const form = await request.formData();
		const cityRaw = String(form.get('city') ?? '').trim();
		if (!isCitySlug(cityRaw)) {
			return fail(400, { message: 'Invalid city.', city: '' });
		}

		const st = parseOptionalHttpsUrl(form.get('short_term_url'));
		const lt = parseOptionalHttpsUrl(form.get('long_term_url'));
		const ap = parseOptionalHttpsUrl(form.get('apply_url'));
		const ct = parseOptionalHttpsUrl(form.get('contact_url'));
		const pg = parseOptionalPropertyGroup(form.get('listing_property_group'));
		const tc = parseOptionalThemeColor(form.get('listing_theme_color'));
		const ob = parseOptionalOrderBy(form.get('listing_order_by'));

		if (!st.ok) return fail(400, { message: st.message, city: cityRaw });
		if (!lt.ok) return fail(400, { message: lt.message, city: cityRaw });
		if (!ap.ok) return fail(400, { message: ap.message, city: cityRaw });
		if (!ct.ok) return fail(400, { message: ct.message, city: cityRaw });
		if (!pg.ok) return fail(400, { message: pg.message, city: cityRaw });
		if (!tc.ok) return fail(400, { message: tc.message, city: cityRaw });
		if (!ob.ok) return fail(400, { message: ob.message, city: cityRaw });

		const db = getDb();
		await db
			.insert(rentalLandingLinks)
			.values({
				citySlug: cityRaw,
				shortTermUrl: st.value,
				longTermUrl: lt.value,
				applyUrl: ap.value,
				contactUrl: ct.value,
				listingPropertyGroup: pg.value,
				listingThemeColor: tc.value,
				listingOrderBy: ob.value
			})
			.onConflictDoUpdate({
				target: rentalLandingLinks.citySlug,
				set: {
					shortTermUrl: st.value,
					longTermUrl: lt.value,
					applyUrl: ap.value,
					contactUrl: ct.value,
					listingPropertyGroup: pg.value,
					listingThemeColor: tc.value,
					listingOrderBy: ob.value,
					updatedAt: sql`now()`
				}
			});

		return { saved: true as const, city: cityRaw };
	}
};
