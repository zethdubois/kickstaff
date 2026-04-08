import type { CitySlug } from '$lib/cities';

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
	/** HTTPS URL for the main-column hero image; null = none. */
	landingHeroImageUrl: string | null;
	landingHeadline: string | null;
	/** Plain text; line breaks preserved in the frame. */
	landingBody: string | null;
};

/** Non-empty trimmed string, or null if unset (tile should be disabled). */
function optional(v: string | undefined | null): string | null {
	const t = v?.trim();
	return t || null;
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
			landingBody: null
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
		landingBody: optional(row.landingBody)
	};
}
