import type { CitySlug } from '$lib/cities';

export type RentalWysiwygTheme = {
	navBg: string | null;
	navFg: string | null;
	navFont: string | null;
	/** Max width of the left nav column (px). */
	navReadingMaxWidthPx: number | null;
	landingBg: string | null;
	landingFg: string | null;
	landingFont: string | null;
	/** Max width of headline/body column (px). */
	landingReadingMaxWidthPx: number | null;
};

export type CityAppfolioLinks = {
	shortTerm: string | null;
	longTerm: string | null;
	apply: string | null;
	contact: string | null;
	tenantPortal: string | null;
	/** AppFolio property group for embedded listings; null disables iframe. */
	listingPropertyGroup: string | null;
	/** AppFolio.Listing `themeColor`; null = use app default when building embed URL. */
	listingThemeColor: string | null;
	/** AppFolio.Listing `defaultOrder` / `filters[order_by]`; null = date_posted. */
	listingOrderBy: string | null;
	/** Hero image URL (https) or uploaded path `/rental-media/...`. */
	landingHeroImageUrl: string | null;
	landingHeadline: string | null;
	/** Plain text; line breaks preserved in the frame. */
	landingBody: string | null;
	/** Admin WYSIWYG overrides; null = use built-in city theme CSS. */
	wysiwyg: RentalWysiwygTheme | null;
};

/** Non-empty trimmed string, or null if unset (tile should be disabled). */
function optional(v: string | undefined | null): string | null {
	const t = v?.trim();
	return t || null;
}

function wysiwygFromRow(row: {
	navWysiwygBg: string | null;
	navWysiwygFg: string | null;
	navWysiwygFont: string | null;
	navWysiwygMaxWidthPx: number | null;
	landingWysiwygBg: string | null;
	landingWysiwygFg: string | null;
	landingWysiwygFont: string | null;
	landingWysiwygMaxWidthPx: number | null;
}): RentalWysiwygTheme | null {
	const anySet =
		row.navWysiwygBg ||
		row.navWysiwygFg ||
		row.navWysiwygFont ||
		row.navWysiwygMaxWidthPx != null ||
		row.landingWysiwygBg ||
		row.landingWysiwygFg ||
		row.landingWysiwygFont ||
		row.landingWysiwygMaxWidthPx != null;
	if (!anySet) return null;
	return {
		navBg: optional(row.navWysiwygBg),
		navFg: optional(row.navWysiwygFg),
		navFont: optional(row.navWysiwygFont),
		navReadingMaxWidthPx: row.navWysiwygMaxWidthPx,
		landingBg: optional(row.landingWysiwygBg),
		landingFg: optional(row.landingWysiwygFg),
		landingFont: optional(row.landingWysiwygFont),
		landingReadingMaxWidthPx: row.landingWysiwygMaxWidthPx
	};
}

/**
 * Maps a DB row (or no row) to the shape used by rental landing pages.
 * Missing row → all nulls; empty columns → null.
 */
export function cityAppfolioLinksFromRow(
	row: {
		shortTermUrl: string | null;
		longTermUrl: string | null;
		applyUrl: string | null;
		contactUrl: string | null;
		tenantPortalUrl: string | null;
		listingPropertyGroup: string | null;
		listingThemeColor: string | null;
		listingOrderBy: string | null;
		landingHeroImageUrl: string | null;
		landingHeadline: string | null;
		landingBody: string | null;
		navWysiwygBg: string | null;
		navWysiwygFg: string | null;
		navWysiwygFont: string | null;
		navWysiwygMaxWidthPx: number | null;
		landingWysiwygBg: string | null;
		landingWysiwygFg: string | null;
		landingWysiwygFont: string | null;
		landingWysiwygMaxWidthPx: number | null;
	} | null
): CityAppfolioLinks {
	if (!row) {
		return {
			shortTerm: null,
			longTerm: null,
			apply: null,
			contact: null,
			tenantPortal: null,
			listingPropertyGroup: null,
			listingThemeColor: null,
			listingOrderBy: null,
			landingHeroImageUrl: null,
			landingHeadline: null,
			landingBody: null,
			wysiwyg: null
		};
	}
	return {
		shortTerm: optional(row.shortTermUrl),
		longTerm: optional(row.longTermUrl),
		apply: optional(row.applyUrl),
		contact: optional(row.contactUrl),
		tenantPortal: optional(row.tenantPortalUrl),
		listingPropertyGroup: optional(row.listingPropertyGroup),
		listingThemeColor: optional(row.listingThemeColor),
		listingOrderBy: optional(row.listingOrderBy),
		landingHeroImageUrl: optional(row.landingHeroImageUrl),
		landingHeadline: optional(row.landingHeadline),
		landingBody: optional(row.landingBody),
		wysiwyg: wysiwygFromRow(row)
	};
}
