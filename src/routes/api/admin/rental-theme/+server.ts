import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isCitySlug } from '$lib/cities';
import { updateWysiwygTheme } from '$lib/server/rentalLandingLinksUpsert';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}
	if (!body || typeof body !== 'object') {
		return json({ message: 'Invalid body' }, { status: 400 });
	}

	const o = body as Record<string, unknown>;
	const cityRaw = String(o.citySlug ?? '').trim();
	if (!isCitySlug(cityRaw)) {
		return json({ message: 'Invalid city.' }, { status: 400 });
	}

	try {
		const result = await updateWysiwygTheme(cityRaw, {
			sidebarTagline: o.sidebarTagline,
			navBg: o.navBg,
			navFg: o.navFg,
			navFont: o.navFont,
			navReadingMaxWidthPx: o.navReadingMaxWidthPx,
			navGradientFrom: o.navGradientFrom,
			navGradientTo: o.navGradientTo,
			navGradientAngleDeg: o.navGradientAngleDeg,
			navFontSizePx: o.navFontSizePx,
			landingBg: o.landingBg,
			landingFg: o.landingFg,
			landingFont: o.landingFont,
			landingReadingMaxWidthPx: o.landingReadingMaxWidthPx,
			landingFontSizePx: o.landingFontSizePx
		});

		if (!result.ok) {
			return json({ message: result.message }, { status: 400 });
		}

		return json({ ok: true as const });
	} catch (e) {
		console.error('POST /api/admin/rental-theme', e);
		const msg = e instanceof Error ? e.message : 'Server error';
		const hint =
			/column .* does not exist|relation .* does not exist/i.test(msg)
				? ' Run `pnpm db:migrate` (or `pnpm db:push`) so the DB matches the schema.'
				: '';
		return json({ message: msg + hint }, { status: 500 });
	}
};
