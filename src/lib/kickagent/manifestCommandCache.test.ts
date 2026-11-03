import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listButtonCandidateCommands,
	manifestCommandLabel,
	type CachedManifestCommand
} from './manifestCommandCache.ts';

const base = { description: '', category: 'Kickagent', execution: 'remote' as const };

describe('manifestCommandLabel', () => {
	it('uses commands[].label and falls back to the command name', () => {
		assert.equal(manifestCommandLabel({ name: 'gl-list', label: 'List accounts' }), 'List accounts');
		assert.equal(manifestCommandLabel({ name: 'gl-list', label: '  ' }), 'gl-list');
		assert.equal(manifestCommandLabel({ name: 'gl-list' }), 'gl-list');
	});
});

describe('listButtonCandidateCommands', () => {
	it('keeps structural commands; skips query, write, shortcut, and unclassified', () => {
		const commands: CachedManifestCommand[] = [
			{ ...base, name: 'gl-list', role: 'query' },
			{ ...base, name: 'gl-show', role: 'query' },
			{ ...base, name: 'gl-update', role: 'write' },
			{ ...base, name: 'gl-create', role: 'structural' },
			{ ...base, name: 'gl-import', role: 'structural' },
			{ ...base, name: 'gl-hide', role: 'shortcut', sugarFor: 'gl-update' },
			{ ...base, name: 'gl-retire', role: 'shortcut', sugarFor: 'gl-update' },
			{ ...base, name: 'hello' }
		];
		assert.deepEqual(
			listButtonCandidateCommands(commands).map((c) => c.name),
			['gl-create', 'gl-import']
		);
	});
});
