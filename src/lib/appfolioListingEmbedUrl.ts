/** Default AppFolio host for embedded city listings (kickasset tenant). */
export const APPFOLIO_LISTINGS_DEFAULT_HOST = 'kickasset.appfolio.com';

/** Matches AppFolio’s sample `Appfolio.Listing({ themeColor: '#95bb3e', ... })` when unset in admin. */
export const APPFOLIO_LISTING_DEFAULT_THEME_COLOR = '#95bb3e';

/**
 * Builds the same `/listings` URL as AppFolio’s `listing.js` widget
 * (https://…/javascripts/listing.js) — i.e. the same query string as:
 *
 * `Appfolio.Listing({ hostUrl, propertyGroup, themeColor, themeFont, defaultOrder, height, width })`
 *
 * Do **not** load the vendor `listing.js` + `document.write` snippet in SvelteKit; use this helper
 * and a normal `<iframe src={url} />` instead.
 */

export type AppfolioListingEmbedUrlOptions = {
	/** Host only, e.g. `kickasset.appfolio.com` (no protocol or path). */
	hostUrl: string;
	/** Property group / list name in AppFolio; maps to `filters[property_list]`. */
	propertyGroup?: string | null;
	themeColor?: string | null;
	themeFont?: string | null;
	/** Maps to `filters[order_by]`; vendor default is `date_posted`. */
	defaultOrder?: string | null;
	/**
	 * When using auto-height + postMessage resize, pass the iframe’s `id`;
	 * adds `iframe_id` like the vendor script when `height === 'auto'`.
	 */
	iframeId?: string | null;
	/** Cache-buster (vendor uses `(new Date).getTime()`). */
	cacheBuster?: number;
	/** Match `listing.js` non-localhost behavior (`https` on https pages). Default `true`. */
	https?: boolean;
};

function trimHost(hostUrl: string): string {
	return hostUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}

/**
 * Returns the full listings URL string, including query string, mirroring `listing.js`.
 */
export function appfolioListingEmbedUrl(options: AppfolioListingEmbedUrlOptions): string {
	const {
		hostUrl,
		propertyGroup,
		themeColor,
		themeFont,
		defaultOrder = 'date_posted',
		iframeId,
		cacheBuster = Date.now(),
		https = true,
	} = options;

	const host = trimHost(hostUrl);
	const protocol = https ? 'https' : 'http';
	const base = `${protocol}://${host}/listings`;

	let q = String(cacheBuster);

	if (propertyGroup) {
		q += `&${encodeURIComponent('filters[property_list]')}=${encodeURIComponent(propertyGroup)}`;
	}
	if (themeColor) {
		q += `&${encodeURIComponent('theme_color')}=${encodeURIComponent(themeColor)}`;
	}
	if (themeFont) {
		q += `&${encodeURIComponent('theme_font')}=${encodeURIComponent(themeFont)}`;
	}
	if (defaultOrder) {
		q += `&${encodeURIComponent('filters[order_by]')}=${encodeURIComponent(defaultOrder)}`;
	}
	if (iframeId) {
		q += `&${encodeURIComponent('iframe_id')}=${encodeURIComponent(iframeId)}`;
	}

	return `${base}?${q}`;
}
