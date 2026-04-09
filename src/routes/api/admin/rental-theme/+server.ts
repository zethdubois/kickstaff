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

	const result = await updateWysiwygTheme(cityRaw, {
		navBg: o.navBg,
		navFg: o.navFg,
		navFont: o.navFont,
		navReadingMaxWidthPx: o.navReadingMaxWidthPx,
		landingBg: o.landingBg,
		landingFg: o.landingFg,
		landingFont: o.landingFont,
		landingReadingMaxWidthPx: o.landingReadingMaxWidthPx
	});

	if (!result.ok) {
		return json({ message: result.message }, { status: 400 });
	}

	return json({ ok: true as const });
};
