/**
 * Wiki and progress are optional mounts on the kickagent publish origin.
 * A surface counts as served only when GET of that path returns 2xx.
 */
import { buildKickagentProxyUpstreamUrl } from '$lib/server/kickagentPathProxy';

export const KICKAGENT_DOC_SURFACES = [
	{ name: 'wiki', href: '/wiki' },
	{ name: 'progress', href: '/progress' }
] as const;

export type KickagentDocSurfaceName = (typeof KICKAGENT_DOC_SURFACES)[number]['name'];

/** Stable dashboard key. Not a runnable command. */
export function kickagentDocDashboardKey(name: string): string {
	return `kickagent:docs:${name}`;
}

export async function kickagentDocSurfaceIsServed(
	baseUrl: string,
	pathname: string,
	token: string | null | undefined,
	fetchImpl: typeof fetch = fetch
): Promise<boolean> {
	const url = buildKickagentProxyUpstreamUrl(baseUrl, pathname, '');
	const headers = new Headers();
	const bearer = token?.trim();
	if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
	try {
		const res = await fetchImpl(url, {
			method: 'GET',
			headers,
			redirect: 'manual',
			signal: AbortSignal.timeout(4000)
		});
		await res.body?.cancel().catch(() => undefined);
		return res.ok;
	} catch {
		return false;
	}
}
