import type { CitySlug } from '$lib/cities';

export type CityAppfolioLinks = {
	shortTerm: string | null;
	longTerm: string | null;
	apply: string | null;
	contact: string | null;
	/** AppFolio property group for embedded listings; null disables iframe. */
	listingPropertyGroup: string | null;
	/** AppFolio.Listing `themeColor`; null = use app default when building embed URL. */
	listingThemeColor: string | null;
	/** AppFolio.Listing `defaultOrder` / `filters[order_by]`; null = date_posted. */
	listingOrderBy: string | null;
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
		listingPropertyGroup: string | null;
		listingThemeColor: string | null;
		listingOrderBy: string | null;
	} | null
): CityAppfolioLinks {
	if (!row) {
		return {
			shortTerm: null,
			longTerm: null,
			apply: null,
			contact: null,
			listingPropertyGroup: null,
			listingThemeColor: null,
			listingOrderBy: null
		};
	}
	return {
		shortTerm: optional(row.shortTermUrl),
		longTerm: optional(row.longTermUrl),
		apply: optional(row.applyUrl),
		contact: optional(row.contactUrl),
		listingPropertyGroup: optional(row.listingPropertyGroup),
		listingThemeColor: optional(row.listingThemeColor),
		listingOrderBy: optional(row.listingOrderBy)
	};
}
