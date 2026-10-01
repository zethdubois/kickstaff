import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	clearManifestResourceCache,
	parseManifestResources,
	resolveDetailPresentationRef,
	resolvePresentationRef,
	setManifestResourceCache
} from './manifestResourceCache.ts';

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
		assert.equal(parsed!.gl, undefined);
		assert.ok(parsed!.units.detail);
		assert.ok(parsed!.units.update);
	});

	it('keeps resources.gl and still accepts resources.units', () => {
		const parsed = parseManifestResources({
			units: {
				version: 1,
				list: {
					command: 'units-list',
					columns: [{ key: 'name', label: 'Name', type: 'string' }]
				}
			},
			gl: {
				version: 1,
				list: {
					command: 'gl-list',
					primaryKey: 'id',
					rowsKey: 'rows',
					columns: [{ key: 'number', label: 'Number', type: 'string' }]
				},
				detail: {
					command: 'gl-show',
					titleKey: 'name',
					submitCommand: 'gl-update'
				},
				update: {
					command: 'gl-update',
					editableFields: ['name', 'hidden']
				}
			}
		});
		assert.ok(parsed?.gl);
		assert.equal(parsed!.units.list.command, 'units-list');
		assert.equal(parsed!.gl!.list.columns[0]!.label, 'Number');
		assert.equal(parsed!.gl!.detail.submitCommand, 'gl-update');
		setManifestResourceCache(parsed);
		assert.equal(resolvePresentationRef('gl.list')?.rowsKey, 'rows');
		assert.equal(resolvePresentationRef('gl-list')?.command, 'gl-list');
		assert.equal(resolvePresentationRef('units.list')?.command, 'units-list');
		assert.equal(resolveDetailPresentationRef('gl.detail')?.submitCommand, 'gl-update');
		assert.equal(resolveDetailPresentationRef('gl.list'), null);
		clearManifestResourceCache();
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
