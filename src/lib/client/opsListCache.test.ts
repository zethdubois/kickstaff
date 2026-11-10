import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ResourceTableModel } from '../kickagent/outcomeToTableModel.ts';
import {
	mergeDetailRecord,
	opsListQueryKey,
	patchListModel,
	staleDetailIds
} from './opsListCache.ts';

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

	it('merges a patch into a detail and keeps the object when nothing changed', () => {
		const detail = { id: 2, name: 'Utilities', hidden: false };
		assert.deepEqual(mergeDetailRecord(detail, { id: '2', name: 'Water' }), {
			id: 2,
			name: 'Water',
			hidden: false
		});
		assert.equal(mergeDetailRecord(detail, { id: 2, name: 'Utilities' }), detail);
	});

	it('drops a detail only when a shared list field changed', () => {
		const records = {
			'1': { id: 1, name: 'Cash', note: 'petty' },
			'2': { id: 2, name: 'Utilities', hidden: false }
		};
		const rows = [
			{ id: 1, name: 'Cash' },
			{ id: '2', name: 'Water', hidden: true }
		];
		assert.deepEqual(staleDetailIds(records, rows, 'id'), ['2']);
		assert.deepEqual(staleDetailIds(records, [{ id: 1, name: 'Cash' }], 'id'), []);
	});
});
