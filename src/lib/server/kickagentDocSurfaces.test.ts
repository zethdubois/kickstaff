import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { kickagentDocProbes, kickagentDocSurfaceIsServed } from './kickagentDocSurfaces.ts';

function fetchStatus(status: number): typeof fetch {
	return (async () => new Response(status === 200 ? '<html></html>' : 'no', { status })) as typeof fetch;
}

describe('kickagentDocProbes', () => {
	it('tries the publish mount before the local dedicated port', () => {
		assert.deepEqual(
			kickagentDocProbes({ publishOrigin: 'http://127.0.0.1:7099' }).filter((p) => p.name === 'wiki'),
			[
				{
					name: 'wiki',
					href: '/wiki',
					probeUrl: 'http://127.0.0.1:7099/wiki/',
					sendToken: true
				},
				{
					name: 'wiki',
					href: 'http://127.0.0.1:7097/',
					probeUrl: 'http://127.0.0.1:7097/',
					sendToken: false
				}
			]
		);
	});
});

describe('kickagentDocSurfaceIsServed', () => {
	it('is served on 2xx', async () => {
		assert.equal(
			await kickagentDocSurfaceIsServed('http://127.0.0.1:7097/', 'tok', fetchStatus(200)),
			true
		);
	});

	it('is not served on 404', async () => {
		assert.equal(
			await kickagentDocSurfaceIsServed('http://127.0.0.1:7099/progress/', 'tok', fetchStatus(404)),
			false
		);
	});

	it('is not served when the request fails', async () => {
		const fetchImpl = (async () => {
			throw new Error('down');
		}) as typeof fetch;
		assert.equal(await kickagentDocSurfaceIsServed('http://127.0.0.1:7097/', null, fetchImpl), false);
	});
});
