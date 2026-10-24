import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyListPrefs, isEmptyListPrefs, normalizeListPrefs } from './listPrefs.ts';

describe('listPrefs', () => {
	it('empty by default and for garbage input', () => {
		assert.ok(isEmptyListPrefs(emptyListPrefs()));
		assert.ok(isEmptyListPrefs(normalizeListPrefs(null)));
		assert.ok(isEmptyListPrefs(normalizeListPrefs('x')));
		assert.ok(isEmptyListPrefs(normalizeListPrefs([])));
	});

	it('drops unchecked, blank, and invalid values', () => {
		const prefs = normalizeListPrefs({
			filterValues: { includeHidden: true, includeRetired: false, type: '  ', q: ' a ' },
			columnFilters: { name: ' cash ', number: '' },
			sort: { key: 'name', dir: 'sideways' }
		});
		assert.deepEqual(prefs, {
			filterValues: { includeHidden: true, q: 'a' },
			columnFilters: { name: 'cash' },
			sort: null
		});
		assert.ok(!isEmptyListPrefs(prefs));
	});

	it('keeps a valid sort and nothing else', () => {
		const prefs = normalizeListPrefs({ sort: { key: 'name', dir: 'desc' } });
		assert.deepEqual(prefs.sort, { key: 'name', dir: 'desc' });
		assert.ok(!isEmptyListPrefs(prefs));
	});
});
