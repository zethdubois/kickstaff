import type { Reroute } from '@sveltejs/kit';
import { vanityPathForRootHost } from '$lib/vanityHosts';

/**
 * Vanity domains: `https://vanity.example/` uses the same route as `/mos` (etc.) without changing the URL.
 * Set PUBLIC_VANITY_HOST_* in Railway. See `.env.example`.
 */
export const reroute: Reroute = ({ url }) => {
	const { pathname, hostname } = url;
	if (pathname === '/' || pathname === '') {
		const target = vanityPathForRootHost(hostname);
		if (target) return target;
	}
};
