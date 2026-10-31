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

export function buildKickagentProxyUpstreamUrl(
	base: string,
	pathname: string,
	search: string
): string {
	const origin = base.replace(/\/+$/, '');
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return `${origin}${path}${search}`;
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
		if (value != null) out.set(name, value);
	}
	return out;
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
 * Proxy one request to kickagent at the same path. Streams the upstream body.
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

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: pickKickagentProxyResponseHeaders(upstream.headers)
	});
}
