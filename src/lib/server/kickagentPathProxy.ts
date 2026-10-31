/**
 * Forward /wiki and /progress to the kickagent publish origin with the service
 * token. Browser never sees KICKAGENT_SERVICE_TOKEN.
 *
 * Spec: docs/guides/contracts/kickstaff-wiki-progress-proxy.md
 *
 * Pure helpers (no `$env`) so unit tests can import this module under `tsx --test`.
 */
import type { SessionUser } from '$lib/server/auth';
import { requireUser } from '$lib/server/guards';

export const KICKAGENT_PROXY_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'] as const;
export type KickagentProxyMethod = (typeof KICKAGENT_PROXY_METHODS)[number];

const FORWARD_RESPONSE_HEADERS = [
	'content-type',
	'content-disposition',
	'cache-control',
	'content-length',
	'etag',
	'last-modified',
	'location',
	'accept-ranges',
	'content-encoding'
] as const;

/** Any signed-in role; unsigned → 303 /login (wiki/progress navigations). */
export function requireKickagentProxyUser(
	user: SessionUser | null
): asserts user is SessionUser {
	requireUser(user);
}

/**
 * Kickagent progress (and similar mounts) redirect `/progress` → `/progress/`.
 * SvelteKit defaults to trailingSlash "never" (`/progress/` → `/progress`).
 * Request the slashed form upstream so we never bounce that redirect to the browser.
 */
export function normalizeKickagentProxyPathname(pathname: string): string {
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	if (path === '/progress' || path === '/wiki') return `${path}/`;
	return path;
}

export function buildKickagentProxyUpstreamUrl(
	base: string,
	pathname: string,
	search: string
): string {
	const origin = base.replace(/\/+$/, '');
	const path = normalizeKickagentProxyPathname(pathname);
	return `${origin}${path}${search}`;
}

/**
 * Keep the browser on the kickstaff origin and avoid slash ping-pong:
 * absolute kickagent Locations become path-only; `/progress/` → `/progress`.
 */
export function rewriteProxyLocationHeader(location: string): string {
	try {
		const u = location.startsWith('/')
			? new URL(location, 'http://kickstaff.proxy.local')
			: new URL(location);
		let path = u.pathname;
		if (path === '/progress/' || path === '/wiki/') {
			path = path.slice(0, -1);
		}
		return `${path}${u.search}${u.hash}`;
	} catch {
		return location;
	}
}

export function buildKickagentProxyRequestHeaders(opts: {
	token: string | null | undefined;
	user: Pick<SessionUser, 'id' | 'email'>;
	contentType?: string | null;
}): Headers {
	const headers = new Headers();
	const token = opts.token?.trim();
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	headers.set('X-Kickagent-User-Id', opts.user.id);
	headers.set('X-Kickagent-User-Email', opts.user.email);
	const ct = opts.contentType?.trim();
	if (ct) {
		headers.set('Content-Type', ct);
	}
	return headers;
}

export function pickKickagentProxyResponseHeaders(upstream: Headers): Headers {
	const out = new Headers();
	for (const name of FORWARD_RESPONSE_HEADERS) {
		const value = upstream.get(name);
		if (value == null) continue;
		out.set(name, name === 'location' ? rewriteProxyLocationHeader(value) : value);
	}
	return out;
}

/**
 * SvelteKit serves `/wiki` without a trailing slash. Relative `href="wiki.css"` then
 * resolves to `/wiki.css` (404). A base tag makes assets resolve under `/wiki/…`.
 */
/** Only the app shells at `/wiki` and `/progress` need a base tag. */
export function htmlBaseHrefForPathname(pathname: string): string | null {
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	if (path === '/wiki' || path === '/wiki/') return '/wiki/';
	if (path === '/progress' || path === '/progress/') return '/progress/';
	return null;
}

export function injectHtmlBaseHref(html: string, baseHref: string): string {
	if (/<base\s/i.test(html)) return html;
	const tag = `<base href="${baseHref}" />`;
	if (/<head[^>]*>/i.test(html)) {
		return html.replace(/<head[^>]*>/i, (open) => `${open}\n    ${tag}`);
	}
	return `${tag}\n${html}`;
}

function isHtmlContentType(value: string | null): boolean {
	if (!value) return false;
	return value.toLowerCase().includes('text/html');
}

export type ProxyKickagentPathInput = {
	/** Null/empty → 502. */
	baseUrl: string | null | undefined;
	token: string | null | undefined;
	user: Pick<SessionUser, 'id' | 'email'>;
	request: Request;
	/** Override for tests. */
	fetchImpl?: typeof fetch;
};

/**
 * Proxy one request to kickagent at the same path.
 * Streams non-HTML bodies; HTML shells get a `<base href>` so relative assets work.
 */
export async function proxyKickagentPath(input: ProxyKickagentPathInput): Promise<Response> {
	const base = input.baseUrl?.trim();
	if (!base) {
		return new Response(
			'kickagent API URL not configured — set PUBLIC_KICKAGENT_MANIFEST_URL or KICKAGENT_API_URL',
			{ status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } }
		);
	}

	const url = new URL(input.request.url);
	const upstreamUrl = buildKickagentProxyUpstreamUrl(base, url.pathname, url.search);
	const method = input.request.method.toUpperCase();
	const headers = buildKickagentProxyRequestHeaders({
		token: input.token,
		user: input.user,
		contentType: input.request.headers.get('content-type')
	});

	const init: RequestInit = {
		method,
		headers,
		redirect: 'manual'
	};

	if (method !== 'GET' && method !== 'HEAD' && input.request.body) {
		init.body = input.request.body;
		// Node fetch requires duplex when streaming a request body.
		(init as RequestInit & { duplex?: string }).duplex = 'half';
	}

	const fetchImpl = input.fetchImpl ?? fetch;
	const upstream = await fetchImpl(upstreamUrl, init);
	const outHeaders = pickKickagentProxyResponseHeaders(upstream.headers);
	const baseHref = htmlBaseHrefForPathname(url.pathname);

	if (
		method !== 'HEAD' &&
		baseHref &&
		upstream.ok &&
		isHtmlContentType(upstream.headers.get('content-type')) &&
		upstream.body
	) {
		const html = await upstream.text();
		const body = injectHtmlBaseHref(html, baseHref);
		outHeaders.delete('content-length');
		return new Response(body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: outHeaders
		});
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: outHeaders
	});
}
