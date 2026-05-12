import { eq, sql } from 'drizzle-orm';
import type { CitySlug } from '$lib/cities';
import { getDb } from '$lib/server/db';
import { rentalLandingLinks, type RentalLandingLink } from '$lib/server/schema';

export const MAX_URL_LEN = 2048;
export const MAX_PROPERTY_GROUP_LEN = 256;
export const MAX_ORDER_BY_LEN = 64;
export const MAX_LANDING_HEADLINE_LEN = 512;
export const MAX_LANDING_BODY_LEN = 32768;
export const MAX_FONT_STACK_LEN = 512;
export const MAX_SIDEBAR_TAGLINE_LEN = 512;

/** HTTPS URL or uploaded asset path `/rental-media/{slug}/filename`. */
export function parseOptionalHeroImageRef(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_URL_LEN) {
		return { ok: false, message: 'A URL exceeds the maximum length.' };
	}
	if (s.startsWith('/rental-media/')) {
		if (!/^\/rental-media\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(s)) {
			return { ok: false, message: 'Invalid uploaded image path.' };
		}
		return { ok: true, value: s };
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

export function parseOptionalPropertyGroup(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_PROPERTY_GROUP_LEN) {
		return { ok: false, message: 'Property group name is too long.' };
	}
	return { ok: true, value: s };
}

export function parseOptionalThemeColor(
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

export function parseOptionalOrderBy(
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

export function parseOptionalHttpsUrl(
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

export function parseOptionalFontStack(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_FONT_STACK_LEN) return { ok: false, message: 'Font stack is too long.' };
	if (/\r|\n/.test(s)) return { ok: false, message: 'Font stack cannot contain line breaks.' };
	return { ok: true, value: s };
}

export function parseOptionalHeroBgPositionYPct(
	raw: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
	if (raw === '' || raw === undefined || raw === null) return { ok: true, value: null };
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		return { ok: false, message: 'Hero vertical position must be a whole number.' };
	}
	if (n < 0 || n > 100) {
		return { ok: false, message: 'Hero vertical position must be between 0 and 100.' };
	}
	return { ok: true, value: n };
}

export function parseOptionalReadingWidthPx(
	raw: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
	if (raw === '' || raw === undefined || raw === null) return { ok: true, value: null };
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		return { ok: false, message: 'Reading width must be a whole number of pixels.' };
	}
	if (n < 200 || n > 1200) {
		return { ok: false, message: 'Reading width must be between 200 and 1200 px.' };
	}
	return { ok: true, value: n };
}

export function parseOptionalGradientAngleDeg(
	raw: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
	if (raw === '' || raw === undefined || raw === null) return { ok: true, value: null };
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		return { ok: false, message: 'Gradient direction must be a whole number of degrees.' };
	}
	if (n < 0 || n > 360) {
		return { ok: false, message: 'Gradient direction must be between 0 and 360.' };
	}
	return { ok: true, value: n };
}

export function parseOptionalNavFontSizePx(
	raw: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
	if (raw === '' || raw === undefined || raw === null) return { ok: true, value: null };
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		return { ok: false, message: 'Nav font size must be a whole number of pixels.' };
	}
	if (n < 11 || n > 24) {
		return { ok: false, message: 'Nav font size must be between 11 and 24 px.' };
	}
	return { ok: true, value: n };
}

export function parseOptionalLandingFontSizePx(
	raw: unknown
): { ok: true; value: number | null } | { ok: false; message: string } {
	if (raw === '' || raw === undefined || raw === null) return { ok: true, value: null };
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		return { ok: false, message: 'Landing font size must be a whole number of pixels.' };
	}
	if (n < 12 || n > 28) {
		return { ok: false, message: 'Landing font size must be between 12 and 28 px.' };
	}
	return { ok: true, value: n };
}

export function parseOptionalSidebarTagline(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_SIDEBAR_TAGLINE_LEN) {
		return { ok: false, message: 'Subtitle is too long.' };
	}
	return { ok: true, value: s };
}

/** Both hex ends required together, or both empty → nulls. */
export function parseNavGradientColorPair(
	fromRaw: unknown,
	toRaw: unknown
): { ok: true; from: string | null; to: string | null } | { ok: false; message: string } {
	const f = parseOptionalThemeColor(fromRaw);
	const t = parseOptionalThemeColor(toRaw);
	if (!f.ok) return { ok: false, message: f.message };
	if (!t.ok) return { ok: false, message: t.message };
	const hasF = f.value != null;
	const hasT = t.value != null;
	if (hasF !== hasT) {
		return { ok: false, message: 'Set both gradient colors or clear both.' };
	}
	return { ok: true, from: f.value, to: t.value };
}

export function parseOptionalLandingHeadline(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) return { ok: true, value: null };
	if (s.length > MAX_LANDING_HEADLINE_LEN) {
		return { ok: false, message: 'Landing headline is too long.' };
	}
	return { ok: true, value: s };
}

export function parseOptionalLandingBody(
	raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s = String(raw ?? '');
	if (!s.trim()) return { ok: true, value: null };
	if (s.length > MAX_LANDING_BODY_LEN) {
		return { ok: false, message: 'Landing body is too long.' };
	}
	return { ok: true, value: s };
}

export type RentalLandingFullParsed = {
	shortTermUrl: string | null;
	longTermUrl: string | null;
	applyUrl: string | null;
	contactUrl: string | null;
	shortTermNewTab: boolean;
	longTermNewTab: boolean;
	applyNewTab: boolean;
	contactNewTab: boolean;
	tenantPortalUrl: string | null;
	listingPropertyGroup: string | null;
	listingThemeColor: string | null;
	listingOrderBy: string | null;
	landingHeroImageUrl: string | null;
	landingHeroBgPositionYPct: number | null;
	landingHeadline: string | null;
	landingBody: string | null;
	sidebarTagline: string | null;
	navWysiwygBg: string | null;
	navWysiwygFg: string | null;
	navWysiwygFont: string | null;
	navWysiwygMaxWidthPx: number | null;
	navWysiwygGradientFrom: string | null;
	navWysiwygGradientTo: string | null;
	navWysiwygGradientAngleDeg: number | null;
	navWysiwygFontSizePx: number | null;
	landingWysiwygBg: string | null;
	landingWysiwygFg: string | null;
	landingWysiwygFont: string | null;
	landingWysiwygMaxWidthPx: number | null;
	landingWysiwygFontSizePx: number | null;
};

export function themeSliceFromRow(row: RentalLandingLink | undefined): Pick<
	RentalLandingFullParsed,
	| 'sidebarTagline'
	| 'navWysiwygBg'
	| 'navWysiwygFg'
	| 'navWysiwygFont'
	| 'navWysiwygMaxWidthPx'
	| 'navWysiwygGradientFrom'
	| 'navWysiwygGradientTo'
	| 'navWysiwygGradientAngleDeg'
	| 'navWysiwygFontSizePx'
	| 'landingWysiwygBg'
	| 'landingWysiwygFg'
	| 'landingWysiwygFont'
	| 'landingWysiwygMaxWidthPx'
	| 'landingWysiwygFontSizePx'
> {
	return {
		sidebarTagline: row?.sidebarTagline ?? null,
		navWysiwygBg: row?.navWysiwygBg ?? null,
		navWysiwygFg: row?.navWysiwygFg ?? null,
		navWysiwygFont: row?.navWysiwygFont ?? null,
		navWysiwygMaxWidthPx: row?.navWysiwygMaxWidthPx ?? null,
		navWysiwygGradientFrom: row?.navWysiwygGradientFrom ?? null,
		navWysiwygGradientTo: row?.navWysiwygGradientTo ?? null,
		navWysiwygGradientAngleDeg: row?.navWysiwygGradientAngleDeg ?? null,
		navWysiwygFontSizePx: row?.navWysiwygFontSizePx ?? null,
		landingWysiwygBg: row?.landingWysiwygBg ?? null,
		landingWysiwygFg: row?.landingWysiwygFg ?? null,
		landingWysiwygFont: row?.landingWysiwygFont ?? null,
		landingWysiwygMaxWidthPx: row?.landingWysiwygMaxWidthPx ?? null,
		landingWysiwygFontSizePx: row?.landingWysiwygFontSizePx ?? null
	};
}

export async function upsertRentalLandingFull(citySlug: CitySlug, row: RentalLandingFullParsed): Promise<void> {
	const db = getDb();
	await db
		.insert(rentalLandingLinks)
		.values({
			citySlug,
			shortTermUrl: row.shortTermUrl,
			longTermUrl: row.longTermUrl,
			applyUrl: row.applyUrl,
			contactUrl: row.contactUrl,
			shortTermNewTab: row.shortTermNewTab,
			longTermNewTab: row.longTermNewTab,
			applyNewTab: row.applyNewTab,
			contactNewTab: row.contactNewTab,
			tenantPortalUrl: row.tenantPortalUrl,
			listingPropertyGroup: row.listingPropertyGroup,
			listingThemeColor: row.listingThemeColor,
			listingOrderBy: row.listingOrderBy,
			landingHeroImageUrl: row.landingHeroImageUrl,
			landingHeroBgPositionYPct: row.landingHeroBgPositionYPct,
			landingHeadline: row.landingHeadline,
			landingBody: row.landingBody,
			sidebarTagline: row.sidebarTagline,
			navWysiwygBg: row.navWysiwygBg,
			navWysiwygFg: row.navWysiwygFg,
			navWysiwygFont: row.navWysiwygFont,
			navWysiwygMaxWidthPx: row.navWysiwygMaxWidthPx,
			navWysiwygGradientFrom: row.navWysiwygGradientFrom,
			navWysiwygGradientTo: row.navWysiwygGradientTo,
			navWysiwygGradientAngleDeg: row.navWysiwygGradientAngleDeg,
			navWysiwygFontSizePx: row.navWysiwygFontSizePx,
			landingWysiwygBg: row.landingWysiwygBg,
			landingWysiwygFg: row.landingWysiwygFg,
			landingWysiwygFont: row.landingWysiwygFont,
			landingWysiwygMaxWidthPx: row.landingWysiwygMaxWidthPx,
			landingWysiwygFontSizePx: row.landingWysiwygFontSizePx
		})
		.onConflictDoUpdate({
			target: rentalLandingLinks.citySlug,
			set: {
				shortTermUrl: row.shortTermUrl,
				longTermUrl: row.longTermUrl,
				applyUrl: row.applyUrl,
				contactUrl: row.contactUrl,
				shortTermNewTab: row.shortTermNewTab,
				longTermNewTab: row.longTermNewTab,
				applyNewTab: row.applyNewTab,
				contactNewTab: row.contactNewTab,
				tenantPortalUrl: row.tenantPortalUrl,
				listingPropertyGroup: row.listingPropertyGroup,
				listingThemeColor: row.listingThemeColor,
				listingOrderBy: row.listingOrderBy,
				landingHeroImageUrl: row.landingHeroImageUrl,
				landingHeroBgPositionYPct: row.landingHeroBgPositionYPct,
				landingHeadline: row.landingHeadline,
				landingBody: row.landingBody,
				sidebarTagline: row.sidebarTagline,
				navWysiwygBg: row.navWysiwygBg,
				navWysiwygFg: row.navWysiwygFg,
				navWysiwygFont: row.navWysiwygFont,
				navWysiwygMaxWidthPx: row.navWysiwygMaxWidthPx,
				navWysiwygGradientFrom: row.navWysiwygGradientFrom,
				navWysiwygGradientTo: row.navWysiwygGradientTo,
				navWysiwygGradientAngleDeg: row.navWysiwygGradientAngleDeg,
				navWysiwygFontSizePx: row.navWysiwygFontSizePx,
				landingWysiwygBg: row.landingWysiwygBg,
				landingWysiwygFg: row.landingWysiwygFg,
				landingWysiwygFont: row.landingWysiwygFont,
				landingWysiwygMaxWidthPx: row.landingWysiwygMaxWidthPx,
				landingWysiwygFontSizePx: row.landingWysiwygFontSizePx,
				updatedAt: sql`now()`
			}
		});
}

/**
 * Updates only landing hero / headline / body for a city (admin inline preview).
 */
export async function updateLandingContentOnly(
	citySlug: CitySlug,
	raw: {
		landingHeroImageUrl: unknown;
		landingHeroBgPositionYPct?: unknown;
		landingHeadline: unknown;
		landingBody: unknown;
	}
): Promise<{ ok: true } | { ok: false; message: string }> {
	const hero = parseOptionalHeroImageRef(raw.landingHeroImageUrl);
	const hy = parseOptionalHeroBgPositionYPct(raw.landingHeroBgPositionYPct);
	const lh = parseOptionalLandingHeadline(raw.landingHeadline);
	const lb = parseOptionalLandingBody(raw.landingBody);
	if (!hero.ok) return { ok: false, message: hero.message };
	if (!hy.ok) return { ok: false, message: hy.message };
	if (!lh.ok) return { ok: false, message: lh.message };
	if (!lb.ok) return { ok: false, message: lb.message };

	const db = getDb();
	const [existing] = await db
		.select({ citySlug: rentalLandingLinks.citySlug })
		.from(rentalLandingLinks)
		.where(eq(rentalLandingLinks.citySlug, citySlug))
		.limit(1);

	if (existing) {
		await db
			.update(rentalLandingLinks)
			.set({
				landingHeroImageUrl: hero.value,
				landingHeroBgPositionYPct: hy.value,
				landingHeadline: lh.value,
				landingBody: lb.value,
				updatedAt: sql`now()`
			})
			.where(eq(rentalLandingLinks.citySlug, citySlug));
	} else {
		await db.insert(rentalLandingLinks).values({
			citySlug,
			landingHeroImageUrl: hero.value,
			landingHeroBgPositionYPct: hy.value,
			landingHeadline: lh.value,
			landingBody: lb.value
		});
	}

	return { ok: true };
}

export type WysiwygThemePayload = {
	sidebarTagline: unknown;
	navBg: unknown;
	navFg: unknown;
	navFont: unknown;
	navReadingMaxWidthPx: unknown;
	navGradientFrom: unknown;
	navGradientTo: unknown;
	navGradientAngleDeg: unknown;
	navFontSizePx: unknown;
	landingBg: unknown;
	landingFg: unknown;
	landingFont: unknown;
	landingReadingMaxWidthPx: unknown;
	landingFontSizePx: unknown;
};

export async function updateWysiwygTheme(
	citySlug: CitySlug,
	raw: WysiwygThemePayload
): Promise<{ ok: true } | { ok: false; message: string }> {
	const sidebarTagline = parseOptionalSidebarTagline(raw.sidebarTagline);
	const navBg = parseOptionalThemeColor(raw.navBg);
	const navFg = parseOptionalThemeColor(raw.navFg);
	const navFont = parseOptionalFontStack(raw.navFont);
	const navW = parseOptionalReadingWidthPx(raw.navReadingMaxWidthPx);
	const grad = parseNavGradientColorPair(raw.navGradientFrom, raw.navGradientTo);
	const gradAngle = parseOptionalGradientAngleDeg(raw.navGradientAngleDeg);
	const navFs = parseOptionalNavFontSizePx(raw.navFontSizePx);
	const landingBg = parseOptionalThemeColor(raw.landingBg);
	const landingFg = parseOptionalThemeColor(raw.landingFg);
	const landingFont = parseOptionalFontStack(raw.landingFont);
	const landingW = parseOptionalReadingWidthPx(raw.landingReadingMaxWidthPx);
	const landingFs = parseOptionalLandingFontSizePx(raw.landingFontSizePx);

	if (!sidebarTagline.ok) return { ok: false, message: sidebarTagline.message };
	if (!navBg.ok) return { ok: false, message: navBg.message };
	if (!navFg.ok) return { ok: false, message: navFg.message };
	if (!navFont.ok) return { ok: false, message: navFont.message };
	if (!navW.ok) return { ok: false, message: navW.message };
	if (!grad.ok) return { ok: false, message: grad.message };
	if (!gradAngle.ok) return { ok: false, message: gradAngle.message };
	if (!navFs.ok) return { ok: false, message: navFs.message };
	if (!landingBg.ok) return { ok: false, message: landingBg.message };
	if (!landingFg.ok) return { ok: false, message: landingFg.message };
	if (!landingFont.ok) return { ok: false, message: landingFont.message };
	if (!landingW.ok) return { ok: false, message: landingW.message };
	if (!landingFs.ok) return { ok: false, message: landingFs.message };

	const gradientFrom = grad.from;
	const gradientTo = grad.to;
	const gradientAngleStored =
		gradientFrom && gradientTo ? gradAngle.value : null;

	const db = getDb();
	const [existing] = await db
		.select({ citySlug: rentalLandingLinks.citySlug })
		.from(rentalLandingLinks)
		.where(eq(rentalLandingLinks.citySlug, citySlug))
		.limit(1);

	const themeCols = {
		sidebarTagline: sidebarTagline.value,
		navWysiwygBg: navBg.value,
		navWysiwygFg: navFg.value,
		navWysiwygFont: navFont.value,
		navWysiwygMaxWidthPx: navW.value,
		navWysiwygGradientFrom: gradientFrom,
		navWysiwygGradientTo: gradientTo,
		navWysiwygGradientAngleDeg: gradientAngleStored,
		navWysiwygFontSizePx: navFs.value,
		landingWysiwygBg: landingBg.value,
		landingWysiwygFg: landingFg.value,
		landingWysiwygFont: landingFont.value,
		landingWysiwygMaxWidthPx: landingW.value,
		landingWysiwygFontSizePx: landingFs.value
	};

	if (existing) {
		await db
			.update(rentalLandingLinks)
			.set({ ...themeCols, updatedAt: sql`now()` })
			.where(eq(rentalLandingLinks.citySlug, citySlug));
	} else {
		await db.insert(rentalLandingLinks).values({
			citySlug,
			...themeCols
		});
	}

	return { ok: true };
}
