import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { kickagentDocSurfaceIsServed } from './kickagentDocSurfaces.ts';

function fetchStatus(status: number): typeof fetch {
	return (async () => new Response(status === 200 ? '<html></html>' : 'no', { status })) as typeof fetch;
}

describe('kickagentDocSurfaceIsServed', () => {
	it('is served on 2xx', async () => {
		assert.equal(
			await kickagentDocSurfaceIsServed('http://ka.example', '/wiki', 'tok', fetchStatus(200)),
			true
		);
	});

	it('is not served on 404', async () => {
		assert.equal(
			await kickagentDocSurfaceIsServed('http://ka.example', '/progress', 'tok', fetchStatus(404)),
			false
		);
	});

	it('is not served when the request fails', async () => {
		const fetchImpl = (async () => {
			throw new Error('down');
		}) as typeof fetch;
		assert.equal(
			await kickagentDocSurfaceIsServed('http://ka.example', '/wiki', null, fetchImpl),
			false
		);
	});
});
