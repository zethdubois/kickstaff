/**
 * Absolute links in outbound mail.
 * Request origin wins (the host the person actually used). PUBLIC_BASE_URL is only a fallback
 * for callers with no request, such as seed scripts.
 */

/** Drop wrapping quotes and a trailing slash. Railway values are sometimes stored quoted. */
export function normalizeSiteBase(raw: string | undefined): string {
	return (raw ?? '')
		.trim()
		.replace(/^['"]+|['"]+$/g, '')
		.replace(/\/+$/, '');
}

/** Prefer the request origin; otherwise the public base URL. Empty when neither is set. */
export function appOrigin(requestOrigin?: string, publicBaseUrl?: string): string {
	return normalizeSiteBase(requestOrigin) || normalizeSiteBase(publicBaseUrl);
}

export function absoluteAppPath(
	path: string,
	requestOrigin?: string,
	publicBaseUrl?: string
): string {
	const base = appOrigin(requestOrigin, publicBaseUrl);
	return base ? `${base}${path}` : path;
}
