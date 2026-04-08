import { eq } from 'drizzle-orm';
import {
	APPFOLIO_LISTING_DEFAULT_THEME_COLOR,
	APPFOLIO_LISTINGS_DEFAULT_HOST,
	appfolioListingEmbedUrl
} from '$lib/appfolioListingEmbedUrl';
import { cityAppfolioLinksFromRow, type CityAppfolioLinks } from '$lib/cityAppfolioLinks';
import type { CitySlug } from '$lib/cities';
import { getDb } from '$lib/server/db';
import { rentalLandingLinks } from '$lib/server/schema';

export async function loadCityAppfolioLinks(slug: CitySlug) {
	const db = getDb();
	const [row] = await db
		.select({
			shortTermUrl: rentalLandingLinks.shortTermUrl,
			longTermUrl: rentalLandingLinks.longTermUrl,
			applyUrl: rentalLandingLinks.applyUrl,
			contactUrl: rentalLandingLinks.contactUrl,
			tenantPortalUrl: rentalLandingLinks.tenantPortalUrl,
			listingPropertyGroup: rentalLandingLinks.listingPropertyGroup,
			listingThemeColor: rentalLandingLinks.listingThemeColor,
			listingOrderBy: rentalLandingLinks.listingOrderBy,
			landingHeroImageUrl: rentalLandingLinks.landingHeroImageUrl,
			landingHeadline: rentalLandingLinks.landingHeadline,
			landingBody: rentalLandingLinks.landingBody,
			navWysiwygBg: rentalLandingLinks.navWysiwygBg,
			navWysiwygFg: rentalLandingLinks.navWysiwygFg,
			navWysiwygFont: rentalLandingLinks.navWysiwygFont,
			navWysiwygMaxWidthPx: rentalLandingLinks.navWysiwygMaxWidthPx,
			landingWysiwygBg: rentalLandingLinks.landingWysiwygBg,
			landingWysiwygFg: rentalLandingLinks.landingWysiwygFg,
			landingWysiwygFont: rentalLandingLinks.landingWysiwygFont,
			landingWysiwygMaxWidthPx: rentalLandingLinks.landingWysiwygMaxWidthPx
		})
		.from(rentalLandingLinks)
		.where(eq(rentalLandingLinks.citySlug, slug))
		.limit(1);
	return cityAppfolioLinksFromRow(row ?? null);
}

/** Full AppFolio `/listings` embed URL for the city (same params as `Appfolio.Listing({...})`), or null if no property group. */
export function listingEmbedUrlForCityLinks(links: CityAppfolioLinks) {
	if (!links.listingPropertyGroup) return null;
	return appfolioListingEmbedUrl({
		hostUrl: APPFOLIO_LISTINGS_DEFAULT_HOST,
		propertyGroup: links.listingPropertyGroup,
		themeColor: links.listingThemeColor ?? APPFOLIO_LISTING_DEFAULT_THEME_COLOR,
		defaultOrder: links.listingOrderBy?.trim() || 'date_posted'
	});
}
