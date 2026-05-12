import { env } from '$env/dynamic/public';
import type { CitySlug } from '$lib/cities';

function stripWww(hostname: string): string {
	return hostname.replace(/^www\./, '');
}

function hostToCityPath(): Map<string, `/${CitySlug}`> {
	const entries: [string | undefined, CitySlug][] = [
		[env.PUBLIC_VANITY_HOST_CDA, 'cda'],
		[env.PUBLIC_VANITY_HOST_MOS, 'mos'],
		[env.PUBLIC_VANITY_HOST_SPT, 'spt']
	];
	const map = new Map<string, `/${CitySlug}`>();
	for (const [raw, slug] of entries) {
		if (!raw?.trim()) continue;
		map.set(stripWww(raw.trim().toLowerCase()), `/${slug}`);
	}
	return map;
}

/**
 * If this host should show a city page at `/`, return that path (e.g. `/mos`).
 */
export function vanityPathForRootHost(hostname: string): `/${CitySlug}` | undefined {
	return hostToCityPath().get(stripWww(hostname.toLowerCase()));
}
