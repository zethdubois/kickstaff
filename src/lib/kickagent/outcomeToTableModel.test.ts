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
			}
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
});
