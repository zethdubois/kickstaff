import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CommandOutcome } from './contracts.ts';
import {
	setManifestResourceCache,
	clearManifestResourceCache
} from './manifestResourceCache.ts';
import { outcomeToTableModel } from './outcomeToTableModel.ts';

describe('outcomeToTableModel', () => {
	it('builds model from data and presentationRef', () => {
		setManifestResourceCache({
			units: {
				version: 1,
				list: {
					command: 'units-list',
					primaryKey: 'id',
					rowsKey: 'rows',
					defaultLimit: 50,
					sortKeys: [],
					columns: [{ key: 'name', label: 'Name', type: 'string' }],
					filters: []
				}
			},
			listDetail: {}
		});
		const outcome: CommandOutcome = {
			presentationRef: 'units.list',
			data: { rows: [{ id: '1', name: 'A' }], count: 1 }
		};
		const model = outcomeToTableModel(outcome);
		assert.ok(model);
		assert.equal(model!.rows.length, 1);
		clearManifestResourceCache();
	});

	it('uses gl.list rows and ignores pipe-separated log', () => {
		setManifestResourceCache({
			units: {
				version: 1,
				list: {
					command: 'units-list',
					primaryKey: 'id',
					rowsKey: 'rows',
					defaultLimit: 50,
					sortKeys: [],
					columns: [{ key: 'name', label: 'Name', type: 'string' }],
					filters: []
				}
			},
			listDetail: {
				gl: {
					name: 'gl',
					class: 'list-detail',
					version: 2,
					list: {
						command: 'gl-list',
						primaryKey: 'id',
						rowsKey: 'rows',
						columns: [
							{ key: 'number', label: 'Number', type: 'string' },
							{ key: 'name', label: 'Name', type: 'string' }
						],
						filters: []
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
							}
						]
					},
					update: {
						command: 'gl-update',
						editableFields: ['name'],
						fields: [{ key: 'name', flag: '--name' }]
					}
				}
			}
		});
		const outcome: CommandOutcome = {
			level: 'info',
			log: ['1000 | Rent | Income'],
			presentationRef: 'gl.list',
			data: { rows: [{ id: 'a1', number: '1000', name: 'Rent' }], count: 1 }
		};
		const model = outcomeToTableModel(outcome);
		assert.equal(model?.columns[0]?.label, 'Number');
		assert.equal(model?.rows[0]?.name, 'Rent');
		assert.equal(outcomeToTableModel({ log: 'no accounts found' }), null);
		clearManifestResourceCache();
	});
});
