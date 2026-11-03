import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { opsResourceLinks } from './opsResources.ts';
import type { ManifestResources } from './manifestResourceCache.ts';

describe('opsResourceLinks', () => {
	it('uses label and shortLabel, and falls back to the resource key', () => {
		const resources = {
			units: {
				version: 1,
				label: 'Units',
				shortLabel: 'Units',
				list: { command: 'units-list', primaryKey: 'id', rowsKey: 'rows', columns: [] }
			},
			listDetail: {
				gl: { name: 'gl', label: 'General Ledger Accounts', shortLabel: 'GL Accounts' },
				sites: { name: 'sites' }
			}
		} as unknown as ManifestResources;

		assert.deepEqual(opsResourceLinks(resources), [
			{ name: 'units', label: 'Units', shortLabel: 'Units', href: '/ops/units' },
			{
				name: 'gl',
				label: 'General Ledger Accounts',
				shortLabel: 'GL Accounts',
				href: '/ops/gl'
			},
			{ name: 'sites', label: 'sites', shortLabel: 'sites', href: '/ops/sites' }
		]);
	});

	it('is empty without a manifest', () => {
		assert.deepEqual(opsResourceLinks(null), []);
	});
});
