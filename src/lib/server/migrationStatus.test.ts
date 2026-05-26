import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import {
	deriveMigrationStatus,
	formatKickdeskMigrateLine,
	loadMigrationJournal
} from './migrationStatus.ts';

describe('deriveMigrationStatus', () => {
	const entries = [
		{ idx: 0, when: 100, tag: '0001_init' },
		{ idx: 1, when: 200, tag: '0002_add_users' },
		{ idx: 2, when: 300, tag: '0003_pending' }
	];

	it('reports ok when all journal entries are applied', () => {
		const result = deriveMigrationStatus(entries, [100, 200, 300]);
		assert.equal(result.state, 'ok');
		assert.equal(result.pendingCount, 0);
		assert.equal(result.appliedCount, 3);
		assert.equal(formatKickdeskMigrateLine(result), 'ok');
	});

	it('reports pending tags when journal when exceeds max applied', () => {
		const result = deriveMigrationStatus(entries, [100, 200]);
		assert.equal(result.state, 'pending');
		assert.equal(result.pendingCount, 1);
		assert.deepEqual(result.pendingTags, ['0003_pending']);
		assert.equal(formatKickdeskMigrateLine(result), 'pending:1');
	});

	it('treats missing migrations table as all pending', () => {
		const result = deriveMigrationStatus(entries, []);
		assert.equal(result.state, 'pending');
		assert.equal(result.pendingCount, 3);
		assert.equal(result.appliedCount, 0);
	});

	it('returns ok for empty journal', () => {
		const result = deriveMigrationStatus([], [999]);
		assert.equal(result.state, 'ok');
		assert.equal(result.journalCount, 0);
	});
});

describe('loadMigrationJournal', () => {
	it('loads the repo drizzle journal', () => {
		const root = resolve(import.meta.dirname, '../../..');
		const journal = loadMigrationJournal(root);
		assert.ok(journal.entries.length > 0);
		assert.ok(journal.entries.every((e) => typeof e.tag === 'string' && typeof e.when === 'number'));
	});
});
