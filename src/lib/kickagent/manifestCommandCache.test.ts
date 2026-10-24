import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listButtonCandidateCommands,
	type CachedManifestCommand
} from './manifestCommandCache.ts';

const base = { description: '', category: 'Kickagent', execution: 'remote' as const };

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
