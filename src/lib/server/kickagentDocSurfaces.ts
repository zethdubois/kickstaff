/**
 * Wiki and progress are either mounted on the kickagent publish origin
 * (`/wiki`, `/progress`) or, in local dev, on their own ports at `/`.
 * A surface counts as served only when GET returns 2xx.
 */

export const KICKAGENT_DOC_SURFACES = ['wiki', 'progress'] as const;

export type KickagentDocSurfaceName = (typeof KICKAGENT_DOC_SURFACES)[number];

/** Local Kickdesk defaults. Publish-origin mounts are tried first. */
export const KICKAGENT_LOCAL_WIKI_ORIGIN = 'http://127.0.0.1:7097';
export const KICKAGENT_LOCAL_PROGRESS_ORIGIN = 'http://127.0.0.1:7095';

export type KickagentDocProbe = {
	name: KickagentDocSurfaceName;
	/** Where the dashboard card opens. */
	href: string;
	probeUrl: string;
	/** Publish mounts expect the service token. Standalone loopback servers do not. */
	sendToken: boolean;
};

function origin(value: string): string {
	return value.replace(/\/+$/, '');
}

/**
 * Probe order per surface: the publish-origin path, then the local dedicated server.
 * The first 2xx wins.
 */
export function kickagentDocProbes(opts: {
	publishOrigin: string | null;
	wikiOrigin?: string;
	progressOrigin?: string;
}): KickagentDocProbe[] {
	const wiki = origin(opts.wikiOrigin ?? KICKAGENT_LOCAL_WIKI_ORIGIN);
	const progress = origin(opts.progressOrigin ?? KICKAGENT_LOCAL_PROGRESS_ORIGIN);
	const probes: KickagentDocProbe[] = [];
	const publish = opts.publishOrigin ? origin(opts.publishOrigin) : '';
	if (publish) {
		probes.push(
			{ name: 'wiki', href: '/wiki', probeUrl: `${publish}/wiki/`, sendToken: true },
			{ name: 'progress', href: '/progress', probeUrl: `${publish}/progress/`, sendToken: true }
		);
	}
	probes.push(
		{ name: 'wiki', href: `${wiki}/`, probeUrl: `${wiki}/`, sendToken: false },
		{ name: 'progress', href: `${progress}/`, probeUrl: `${progress}/`, sendToken: false }
	);
	return probes;
}

/** Stable dashboard key. Not a runnable command. */
export function kickagentDocDashboardKey(name: string): string {
	return `kickagent:docs:${name}`;
}

export async function kickagentDocSurfaceIsServed(
	url: string,
	token: string | null | undefined,
	fetchImpl: typeof fetch = fetch
): Promise<boolean> {
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
