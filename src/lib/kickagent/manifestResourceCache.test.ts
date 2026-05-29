import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseManifestResources } from './manifestResourceCache.ts';

describe('parseManifestResources', () => {
	it('caches units.list when detail and update are missing', () => {
		const parsed = parseManifestResources({
			units: {
				version: 1,
				list: {
					command: 'units-list',
					primaryKey: 'id',
					rowsKey: 'rows',
					columns: [{ key: 'name', label: 'Name', type: 'string' }]
				}
			}
		});
		assert.ok(parsed);
		assert.equal(parsed!.units.list.command, 'units-list');
		assert.ok(parsed!.units.detail);
		assert.ok(parsed!.units.update);
	});

	it('returns null when list columns are empty', () => {
		assert.equal(
			parseManifestResources({
				units: { version: 1, list: { columns: [] } }
			}),
			null
		);
	});
});
