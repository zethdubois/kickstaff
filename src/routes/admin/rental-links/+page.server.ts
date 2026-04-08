import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { cities, isCitySlug } from '$lib/cities';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { rentalLandingLinks } from '$lib/server/schema';
import {
	parseOptionalHeroImageRef,
	parseOptionalHttpsUrl,
	parseOptionalLandingBody,
	parseOptionalLandingHeadline,
	parseOptionalOrderBy,
	parseOptionalPropertyGroup,
	parseOptionalThemeColor,
	themeSliceFromRow,
	upsertRentalLandingFull
} from '$lib/server/rentalLandingLinksUpsert';

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
				tenantPortalUrl: row?.tenantPortalUrl ?? '',
				listingPropertyGroup: row?.listingPropertyGroup ?? '',
				listingThemeColor: row?.listingThemeColor ?? '',
				listingOrderBy: row?.listingOrderBy ?? '',
				landingHeroImageUrl: row?.landingHeroImageUrl ?? '',
				landingHeadline: row?.landingHeadline ?? '',
				landingBody: row?.landingBody ?? ''
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
		const tp = parseOptionalHttpsUrl(form.get('tenant_portal_url'));
		const pg = parseOptionalPropertyGroup(form.get('listing_property_group'));
		const tc = parseOptionalThemeColor(form.get('listing_theme_color'));
		const ob = parseOptionalOrderBy(form.get('listing_order_by'));
		const hero = parseOptionalHeroImageRef(form.get('landing_hero_image_url'));
		const lh = parseOptionalLandingHeadline(form.get('landing_headline'));
		const lb = parseOptionalLandingBody(form.get('landing_body'));

		if (!st.ok) return fail(400, { message: st.message, city: cityRaw });
		if (!lt.ok) return fail(400, { message: lt.message, city: cityRaw });
		if (!ap.ok) return fail(400, { message: ap.message, city: cityRaw });
		if (!ct.ok) return fail(400, { message: ct.message, city: cityRaw });
		if (!tp.ok) return fail(400, { message: tp.message, city: cityRaw });
		if (!pg.ok) return fail(400, { message: pg.message, city: cityRaw });
		if (!tc.ok) return fail(400, { message: tc.message, city: cityRaw });
		if (!ob.ok) return fail(400, { message: ob.message, city: cityRaw });
		if (!hero.ok) return fail(400, { message: hero.message, city: cityRaw });
		if (!lh.ok) return fail(400, { message: lh.message, city: cityRaw });
		if (!lb.ok) return fail(400, { message: lb.message, city: cityRaw });

		const db = getDb();
		const [existing] = await db
			.select()
			.from(rentalLandingLinks)
			.where(eq(rentalLandingLinks.citySlug, cityRaw))
			.limit(1);

		await upsertRentalLandingFull(cityRaw, {
			shortTermUrl: st.value,
			longTermUrl: lt.value,
			applyUrl: ap.value,
			contactUrl: ct.value,
			tenantPortalUrl: tp.value,
			listingPropertyGroup: pg.value,
			listingThemeColor: tc.value,
			listingOrderBy: ob.value,
			landingHeroImageUrl: hero.value,
			landingHeadline: lh.value,
			landingBody: lb.value,
			...themeSliceFromRow(existing)
		});

		return { saved: true as const, city: cityRaw };
	}
};
