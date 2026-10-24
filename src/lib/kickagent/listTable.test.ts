import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	columnGate,
	compareCell,
	effectiveSort,
	filterRows,
	nextSort,
	sortRows,
	visibleColumns
} from './listTable.ts';
import type { ManifestListFilter, ManifestResourceColumn } from './manifestResourceCache.ts';

const columns: ManifestResourceColumn[] = [
	{ key: 'number', label: 'Number', type: 'string' },
	{ key: 'name', label: 'Name', type: 'string' },
	{ key: 'balance', label: 'Balance', type: 'money-dollars' },
	{ key: 'hidden', label: 'Hidden', type: 'boolean' },
	{ key: 'retiredAt', label: 'Retired', type: 'datetime' }
];

const filters: ManifestListFilter[] = [
	{ key: 'type', flag: '--type', type: 'string', match: 'exact', label: 'Type' },
	{ key: 'includeHidden', flag: '--hidden', type: 'boolean', match: 'presence', label: 'Include hidden' },
	{ key: 'includeRetired', flag: '--retired', type: 'boolean', match: 'presence', label: 'Include retired' }
];

describe('sort', () => {
	it('defaults to the first column ascending', () => {
		assert.deepEqual(effectiveSort(columns, null), { key: 'number', dir: 'asc' });
		assert.equal(effectiveSort([], null), null);
	});

	it('ignores a saved sort whose column is not shown', () => {
		assert.deepEqual(effectiveSort(columns.slice(0, 2), { key: 'retiredAt', dir: 'desc' }), {
			key: 'number',
			dir: 'asc'
		});
	});

	it('clicking cycles asc/desc and returns null for the default', () => {
		// default → first column flips to desc
		assert.deepEqual(nextSort(columns, null, 'number'), { key: 'number', dir: 'desc' });
		// desc → back to default (nothing to save)
		assert.equal(nextSort(columns, { key: 'number', dir: 'desc' }, 'number'), null);
		// other column starts ascending, then flips
		assert.deepEqual(nextSort(columns, null, 'name'), { key: 'name', dir: 'asc' });
		assert.deepEqual(nextSort(columns, { key: 'name', dir: 'asc' }, 'name'), {
			key: 'name',
			dir: 'desc'
		});
	});

	it('sorts numerically for numeric types, naturally for strings, blanks last both ways', () => {
		const rows = [
			{ number: '1000', balance: '5' },
			{ number: '200', balance: null },
			{ number: '30', balance: '120' }
		];
		assert.deepEqual(
			sortRows(rows, columns, { key: 'number', dir: 'asc' }).map((r) => r.number),
			['30', '200', '1000']
		);
		assert.deepEqual(
			sortRows(rows, columns, { key: 'balance', dir: 'asc' }).map((r) => r.number),
			['1000', '30', '200']
		);
		assert.deepEqual(
			sortRows(rows, columns, { key: 'balance', dir: 'desc' }).map((r) => r.number),
			['30', '1000', '200']
		);
	});

	it('compareCell handles dates', () => {
		assert.ok(compareCell('datetime', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z') < 0);
	});
});

describe('filterRows', () => {
	const rows = [
		{ number: '1000', name: 'Cash Operating', hidden: false },
		{ number: '2000', name: 'Accounts Payable', hidden: true },
		{ number: '3000', name: null, hidden: false }
	];

	it('substring, case-insensitive, all filters must match', () => {
		assert.equal(filterRows(rows, columns, { name: 'cash' }).length, 1);
		assert.equal(filterRows(rows, columns, { name: 'a', number: '2' }).length, 1);
		assert.equal(filterRows(rows, columns, { name: '  ' }).length, 3);
	});

	it('ignores boolean columns and columns not shown', () => {
		assert.equal(filterRows(rows, columns, { hidden: 'true' }).length, 3);
		assert.equal(filterRows(rows, columns.slice(0, 2), { balance: 'x' }).length, 3);
	});
});

describe('column visibility', () => {
	it('gates hidden/retiredAt by the include checkboxes (interim convention)', () => {
		assert.equal(columnGate(columns[3]!, filters), 'includeHidden');
		assert.equal(columnGate(columns[4]!, filters), 'includeRetired');
		assert.equal(columnGate(columns[0]!, filters), null);
		assert.deepEqual(
			visibleColumns(columns, filters, {}).map((c) => c.key),
			['number', 'name', 'balance']
		);
		assert.deepEqual(
			visibleColumns(columns, filters, { includeRetired: true }).map((c) => c.key),
			['number', 'name', 'balance', 'retiredAt']
		);
		assert.deepEqual(
			visibleColumns(columns, filters, { includeHidden: true, includeRetired: true }).map(
				(c) => c.key
			),
			['number', 'name', 'balance', 'hidden', 'retiredAt']
		);
	});

	it('publisher visibleWhen wins over the convention', () => {
		const custom: ManifestResourceColumn[] = [
			{ key: 'name', label: 'Name', type: 'string' },
			{ key: 'note', label: 'Note', type: 'string', visibleWhen: 'includeHidden' }
		];
		assert.deepEqual(
			visibleColumns(custom, filters, {}).map((c) => c.key),
			['name']
		);
		assert.deepEqual(
			visibleColumns(custom, filters, { includeHidden: true }).map((c) => c.key),
			['name', 'note']
		);
	});
});
