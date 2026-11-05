import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveKlioUpstreamUrl } from './klioUpstream.ts';

describe('resolveKlioUpstreamUrl', () => {
	it('uses devOrigin plus path on a laptop manifest', () => {
		assert.equal(
			resolveKlioUpstreamUrl(
				{ path: '/klio', commands: ['ask'], devOrigin: 'http://127.0.0.1:7094' },
				'http://127.0.0.1:7099'
			),
			'http://127.0.0.1:7094/klio'
		);
	});

	it('uses the publish origin when devOrigin is absent', () => {
		assert.equal(
			resolveKlioUpstreamUrl({ path: '/klio', commands: ['ask'] }, 'https://kickagent.example'),
			'https://kickagent.example/klio'
		);
	});

	it('does not proxy when ask is not offered', () => {
		assert.equal(
			resolveKlioUpstreamUrl({ path: '/klio', commands: [] }, 'https://kickagent.example'),
			null
		);
	});
});
