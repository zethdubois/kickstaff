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
	it('caches units v1 when detail and update are missing', () => {
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
		assert.equal(parsed!.units?.list.command, 'units-list');
		assert.deepEqual(parsed!.listDetail, {});
		assert.equal(parsed!.units?.detail, undefined);
		assert.equal(parsed!.units?.update, undefined);
	});

	it('discovers list-detail gl by class and keeps units', () => {
		const parsed = parseManifestResources({
			units: {
				version: 1,
				list: {
					command: 'units-list',
					columns: [{ key: 'name', label: 'Name', type: 'string' }]
				}
			},
			gl: {
				class: 'list-detail',
				version: 2,
				label: 'General Ledger Accounts',
				shortLabel: 'GL Accounts',
				list: {
					command: 'gl-list',
					label: 'List accounts',
					primaryKey: 'id',
					rowsKey: 'rows',
					columns: [{ key: 'number', label: 'Number', type: 'string' }],
					filters: [
						{
							key: 'includeHidden',
							flag: '--include-hidden',
							type: 'boolean',
							match: 'presence',
							label: 'Include hidden'
						}
					]
				},
				detail: {
					command: 'gl-show',
					titleKey: 'name',
					recordKey: 'account',
					submitCommand: 'gl-update',
					fields: [
						{
							key: 'name',
							label: 'Name',
							type: 'string',
							editable: true,
							flag: '--name'
						},
						{
							key: 'id',
							label: 'Id',
							type: 'uuid',
							editable: false,
							flag: '--id'
						},
						{
							key: 'retired',
							label: 'Retired',
							type: 'boolean',
							editable: true,
							flag: '--retired',
							irreversible: true,
							confirmText: 'Retire this account?',
							group: 'status'
						},
						{
							key: 'hidden',
							label: 'Hidden',
							type: 'boolean',
							editable: true,
							flag: '--hidden',
							group: 'status'
						}
					]
				},
				update: {
					command: 'gl-update',
					label: 'Update account',
					editableFields: ['name'],
					fields: [{ key: 'name', flag: '--name' }]
				}
			}
		});
		assert.ok(parsed?.listDetail.gl);
		assert.equal(parsed!.listDetail.gl!.label, 'General Ledger Accounts');
		assert.equal(parsed!.listDetail.gl!.shortLabel, 'GL Accounts');
		assert.equal(parsed!.listDetail.gl!.list.label, 'List accounts');
		assert.equal(parsed!.listDetail.gl!.update?.label, 'Update account');
		assert.equal(parsed!.listDetail.gl!.class, 'list-detail');
		assert.equal(parsed!.listDetail.gl!.list.filters[0]!.match, 'presence');
		assert.equal(parsed!.listDetail.gl!.detail.recordKey, 'account');
		const fields = parsed!.listDetail.gl!.detail.fields;
		const retired = fields.find((f) => f.key === 'retired');
		assert.equal(retired?.irreversible, true);
		assert.equal(retired?.confirmText, 'Retire this account?');
		assert.equal(retired?.group, 'status');
		assert.equal(fields.find((f) => f.key === 'hidden')?.group, 'status');
		assert.equal(fields.find((f) => f.key === 'name')?.irreversible, undefined);
		assert.equal(parsed!.units?.list.command, 'units-list');
		setManifestResourceCache(parsed);
		assert.equal(resolvePresentationRef('gl.list')?.rowsKey, 'rows');
		assert.equal(resolvePresentationRef('gl-list')?.command, 'gl-list');
		assert.equal(resolvePresentationRef('units.list')?.command, 'units-list');
		assert.equal(resolveDetailPresentationRef('gl.detail')?.submitCommand, 'gl-update');
		clearManifestResourceCache();
	});

	it('keeps a show-only list-detail resource that has no submitCommand', () => {
		const parsed = parseManifestResources({
			sites: {
				class: 'list-detail',
				version: 2,
				list: {
					command: 'sites-list',
					primaryKey: 'id',
					rowsKey: 'rows',
					columns: [{ key: 'name', label: 'Name', type: 'string' }],
					filters: [
						{
							key: 'afId',
							flag: '--af-id',
							type: 'string',
							match: 'exact',
							label: 'AF ID'
						}
					]
				},
				detail: {
					command: 'sites-show',
					titleKey: 'name',
					recordKey: 'site',
					fields: [
						{ key: 'id', label: 'Id', type: 'uuid', editable: false, flag: '--id' },
						{ key: 'name', label: 'Name', type: 'string', editable: false }
					]
				}
			}
		});
		assert.ok(parsed?.listDetail.sites);
		assert.equal(parsed!.listDetail.sites!.detail.submitCommand, undefined);
		assert.equal(parsed!.listDetail.sites!.update, undefined);
		assert.equal(parsed!.listDetail.sites!.detail.recordKey, 'site');
		setManifestResourceCache(parsed);
		assert.equal(resolvePresentationRef('sites.list')?.command, 'sites-list');
		assert.equal(resolveDetailPresentationRef('sites.detail')?.command, 'sites-show');
		clearManifestResourceCache();
	});

	it('returns null when nothing parseable', () => {
		assert.equal(parseManifestResources({}), null);
		assert.equal(
			parseManifestResources({
				units: { version: 1, list: { columns: [] } }
			}),
			null
		);
	});
});
