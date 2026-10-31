import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isRedirect } from '@sveltejs/kit';
import {
	buildKickagentProxyRequestHeaders,
	buildKickagentProxyUpstreamUrl,
	normalizeKickagentProxyPathname,
	proxyKickagentPath,
	requireKickagentProxyUser,
	rewriteProxyLocationHeader
} from './kickagentPathProxy.ts';

describe('kickagentPathProxy', () => {
	it('auth gate: unsigned user redirects to /login', () => {
		try {
			requireKickagentProxyUser(null);
			assert.fail('expected redirect');
		} catch (e) {
			assert.equal(isRedirect(e), true);
			if (isRedirect(e)) {
				assert.equal(e.status, 303);
				assert.equal(e.location, '/login');
			}
		}
	});

	it('builds upstream URL with same path and query', () => {
		assert.equal(
			buildKickagentProxyUpstreamUrl(
				'https://kickagent-staging.up.railway.app/',
				'/wiki/docs/foo.md',
				'?q=1'
			),
			'https://kickagent-staging.up.railway.app/wiki/docs/foo.md?q=1'
		);
	});

	it('requests /progress and /wiki with a trailing slash upstream', () => {
		assert.equal(normalizeKickagentProxyPathname('/progress'), '/progress/');
		assert.equal(normalizeKickagentProxyPathname('/wiki'), '/wiki/');
		assert.equal(
			buildKickagentProxyUpstreamUrl('https://ka.example', '/progress', ''),
			'https://ka.example/progress/'
		);
	});

	it('rewrites Location to path-only without trailing slash on mounts', () => {
		assert.equal(rewriteProxyLocationHeader('/progress/'), '/progress');
		assert.equal(
			rewriteProxyLocationHeader('https://kickagent.example/progress/'),
			'/progress'
		);
		assert.equal(rewriteProxyLocationHeader('/progress/api/entries'), '/progress/api/entries');
	});

	it('sets Bearer and user headers; does not set Cookie', () => {
		const headers = buildKickagentProxyRequestHeaders({
			token: 'secret-token',
			user: { id: 'user-1', email: 'a@example.com' },
			contentType: 'application/json'
		});
		assert.equal(headers.get('Authorization'), 'Bearer secret-token');
		assert.equal(headers.get('X-Kickagent-User-Id'), 'user-1');
		assert.equal(headers.get('X-Kickagent-User-Email'), 'a@example.com');
		assert.equal(headers.get('Content-Type'), 'application/json');
		assert.equal(headers.get('Cookie'), null);
	});

	it('omits Authorization when token is missing', () => {
		const headers = buildKickagentProxyRequestHeaders({
			token: null,
			user: { id: 'user-1', email: 'a@example.com' }
		});
		assert.equal(headers.get('Authorization'), null);
	});

	it('returns 502 when base URL is missing', async () => {
		const res = await proxyKickagentPath({
			baseUrl: null,
			token: 't',
			user: { id: 'u', email: 'a@example.com' },
			request: new Request('https://kickstaff.example/wiki')
		});
		assert.equal(res.status, 502);
		const text = await res.text();
		assert.match(text, /PUBLIC_KICKAGENT_MANIFEST_URL|KICKAGENT_API_URL/);
	});

	it('forwards method, path, Bearer, and user headers to upstream', async () => {
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			calls.push({ url: String(input), init: init ?? {} });
			return new Response('<html>wiki</html>', {
				status: 200,
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});
		};

		const res = await proxyKickagentPath({
			baseUrl: 'https://kickagent.example',
			token: 'svc-token',
			user: { id: 'uid-9', email: 'user@example.com' },
			request: new Request('https://host.example/wiki/index.html?x=1', {
				method: 'GET',
				headers: { cookie: 'ka_session_prod=secret' }
			}),
			fetchImpl
		});

		assert.equal(res.status, 200);
		assert.equal(await res.text(), '<html>wiki</html>');
		assert.equal(calls.length, 1);
		assert.equal(calls[0]!.url, 'https://kickagent.example/wiki/index.html?x=1');
		const h = new Headers(calls[0]!.init.headers);
		assert.equal(h.get('Authorization'), 'Bearer svc-token');
		assert.equal(h.get('X-Kickagent-User-Id'), 'uid-9');
		assert.equal(h.get('X-Kickagent-User-Email'), 'user@example.com');
		assert.equal(h.get('Cookie'), null);
	});

	it('does not forward a /progress → /progress/ redirect to the browser', async () => {
		const fetchImpl: typeof fetch = async (input) => {
			assert.equal(String(input), 'https://kickagent.example/progress/');
			return new Response('<html>progress</html>', {
				status: 200,
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});
		};

		const res = await proxyKickagentPath({
			baseUrl: 'https://kickagent.example',
			token: 'svc-token',
			user: { id: 'uid-9', email: 'user@example.com' },
			request: new Request('https://host.example/progress', { method: 'GET' }),
			fetchImpl
		});

		assert.equal(res.status, 200);
		assert.equal(res.headers.get('location'), null);
		assert.equal(await res.text(), '<html>progress</html>');
	});

	it('rewrites upstream Location so slash ping-pong cannot restart', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(null, {
				status: 302,
				headers: { Location: 'https://kickagent.example/progress/' }
			});

		const res = await proxyKickagentPath({
			baseUrl: 'https://kickagent.example',
			token: 't',
			user: { id: 'u', email: 'a@example.com' },
			request: new Request('https://host.example/progress', { method: 'GET' }),
			fetchImpl
		});

		assert.equal(res.status, 302);
		assert.equal(res.headers.get('location'), '/progress');
	});
});
