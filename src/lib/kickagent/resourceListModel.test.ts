import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listItemsFromModel,
	resolveListLabelKey
} from './resourceListModel.ts';
import type { ResourceTableModel } from './outcomeToTableModel.ts';

const model: ResourceTableModel = {
	presentationRef: 'units.list',
	primaryKey: 'id',
	columns: [
		{ key: 'name', label: 'Name', type: 'string' },
		{ key: 'city', label: 'City', type: 'string' }
	],
	rows: [
		{ id: 'a1', name: '10th Street', city: 'CDA' },
		{ id: 'a2', name: '113 N Jackson', city: 'Moscow' }
	],
	meta: { count: 2 }
};

describe('resourceListModel', () => {
	it('uses name as list label key when present', () => {
		assert.equal(resolveListLabelKey(model), 'name');
		const items = listItemsFromModel(model);
		assert.equal(items.length, 2);
		assert.equal(items[0]!.label, '10th Street');
		assert.equal(items[0]!.key, 'a1');
	});
});
