import { env } from '$env/dynamic/public';
import { rentalPagePath, type CitySlug } from '$lib/cities';

function stripWww(hostname: string): string {
	return hostname.replace(/^www\./, '');
}

function hostToCityPath(): Map<string, `/rent/${CitySlug}`> {
	const entries: [string | undefined, CitySlug][] = [
		[env.PUBLIC_VANITY_HOST_CDA, 'cda'],
		[env.PUBLIC_VANITY_HOST_MOS, 'mos'],
		[env.PUBLIC_VANITY_HOST_SPT, 'spt']
	];
	const map = new Map<string, `/rent/${CitySlug}`>();
	for (const [raw, slug] of entries) {
		if (!raw?.trim()) continue;
		map.set(stripWww(raw.trim().toLowerCase()), rentalPagePath(slug));
	}
	return map;
}

/**
 * If this host should show a city page at `/`, return the internal route (e.g. `/rent/mos`).
 * The browser URL stays `/`.
 */
export function vanityPathForRootHost(hostname: string): `/rent/${CitySlug}` | undefined {
	return hostToCityPath().get(stripWww(hostname.toLowerCase()));
}
