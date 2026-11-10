import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ResourceTableModel } from '../kickagent/outcomeToTableModel.ts';
import { opsListQueryKey, patchListModel } from './opsListCache.ts';

function model(): ResourceTableModel {
	return {
		presentationRef: 'resources.gl',
		columns: [],
		primaryKey: 'id',
		rows: [
			{ id: 1, name: 'Cash' },
			{ id: 2, name: 'Utilities' }
		],
		meta: {}
	};
}

describe('ops list cache', () => {
	it('keys server args in order', () => {
		assert.equal(opsListQueryKey([]), '');
		assert.notEqual(opsListQueryKey(['--hidden', 'true']), opsListQueryKey(['--hidden', 'false']));
	});

	it('patches a row by id and leaves the rest', () => {
		const current = model();
		const next = patchListModel(current, { id: '2', name: 'Water' });
		assert.equal(next.rows[0]?.name, 'Cash');
		assert.equal(next.rows[1]?.name, 'Water');
		assert.equal(patchListModel(current, { id: 9, name: 'Nope' }), current);
	});
});
